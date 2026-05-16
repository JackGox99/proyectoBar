package repository

import (
	"time"

	"gorm.io/gorm"
)

// SalesFilter encapsula los filtros opcionales del reporte de ventas (HU028).
type SalesFilter struct {
	VenueID *uint
	From    *time.Time
	To      *time.Time
}

// SalesReportRow representa una línea del reporte: un ítem vendido dentro de un pedido pagado.
type SalesReportRow struct {
	Fecha           time.Time `json:"fecha"`
	OrderID         uint      `json:"order_id"`
	ProductoID      uint      `json:"producto_id"`
	Producto        string    `json:"producto"`
	CantidadVendida int       `json:"cantidad_vendida"`
	PrecioVenta     float64   `json:"precio_venta"`
	CostoCompra     float64   `json:"costo_compra"`
	Ganancia        float64   `json:"ganancia"`
	Sede            string    `json:"sede"`
	MetodoPago      string    `json:"metodo_pago"`
}

// TopProduct resume las unidades totales vendidas de un producto en el período.
type TopProduct struct {
	ProductoID    uint   `json:"producto_id"`
	Nombre        string `json:"nombre"`
	TotalQuantity int    `json:"total_quantity"`
}

// ReportKPIs agrupa los indicadores clave del reporte.
type ReportKPIs struct {
	TotalRevenue     float64 `json:"total_revenue"`
	TransactionCount int64   `json:"transaction_count"`
}

// ReportRepository define las consultas de agregación para reportes (HU028).
type ReportRepository interface {
	GetRows(f SalesFilter) ([]SalesReportRow, error)
	GetKPIs(f SalesFilter) (ReportKPIs, error)
	GetTopProducts(f SalesFilter) ([]TopProduct, error)
}

type reportRepository struct {
	db *gorm.DB
}

func NewReportRepository(db *gorm.DB) ReportRepository {
	return &reportRepository{db: db}
}

// whereClause construye la cláusula WHERE + argumentos comunes a todas las queries.
// Siempre filtra pedidos en estado 'pagado'.
func buildWhere(f SalesFilter) (string, []interface{}) {
	where := " WHERE p.estado = 'pagado'"
	var args []interface{}
	if f.VenueID != nil {
		where += " AND p.sede_id = ?"
		args = append(args, *f.VenueID)
	}
	if f.From != nil {
		where += " AND pag.fecha >= ?"
		args = append(args, *f.From)
	}
	if f.To != nil {
		where += " AND pag.fecha <= ?"
		args = append(args, *f.To)
	}
	return where, args
}

// GetRows retorna el detalle línea a línea: un registro por ítem en cada pedido pagado.
func (r *reportRepository) GetRows(f SalesFilter) ([]SalesReportRow, error) {
	where, args := buildWhere(f)
	sql := `
SELECT
    pag.fecha,
    p.id                                                        AS order_id,
    prod.id                                                     AS producto_id,
    prod.nombre                                                 AS producto,
    pd.cantidad                                                 AS cantidad_vendida,
    pd.precio_unitario                                          AS precio_venta,
    prod.costo_compra,
    (pd.precio_unitario - prod.costo_compra) * pd.cantidad      AS ganancia,
    s.nombre                                                    AS sede,
    pag.metodo_pago
FROM pagos pag
JOIN pedidos p        ON p.id       = pag.pedido_id
JOIN pedido_detalle pd ON pd.pedido_id = p.id
JOIN productos prod   ON prod.id    = pd.producto_id
JOIN sedes s          ON s.id       = p.sede_id` +
		where + ` ORDER BY pag.fecha DESC`

	var rows []SalesReportRow
	return rows, r.db.Raw(sql, args...).Scan(&rows).Error
}

// GetKPIs calcula ingresos totales y conteo de transacciones en el período.
func (r *reportRepository) GetKPIs(f SalesFilter) (ReportKPIs, error) {
	where, args := buildWhere(f)
	sql := `
SELECT
    COALESCE(SUM(pag.total), 0) AS total_revenue,
    COUNT(pag.id)               AS transaction_count
FROM pagos pag
JOIN pedidos p ON p.id = pag.pedido_id` + where

	var kpis ReportKPIs
	return kpis, r.db.Raw(sql, args...).Scan(&kpis).Error
}

// GetTopProducts retorna los 10 productos más vendidos por cantidad de unidades.
func (r *reportRepository) GetTopProducts(f SalesFilter) ([]TopProduct, error) {
	where, args := buildWhere(f)
	sql := `
SELECT
    prod.id        AS producto_id,
    prod.nombre,
    SUM(pd.cantidad) AS total_quantity
FROM pedido_detalle pd
JOIN pedidos p      ON p.id      = pd.pedido_id
JOIN pagos pag      ON pag.pedido_id = p.id
JOIN productos prod ON prod.id   = pd.producto_id` +
		where + `
GROUP BY prod.id, prod.nombre
ORDER BY total_quantity DESC
LIMIT 10`

	var top []TopProduct
	return top, r.db.Raw(sql, args...).Scan(&top).Error
}
