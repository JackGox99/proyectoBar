package models

import "time"

type Inventory struct {
	ID          uint      `gorm:"primaryKey"                                      json:"id"`
	SedeID      uint      `gorm:"uniqueIndex:uq_inv_sede_producto;not null"        json:"sede_id"`
	Sede        Venue     `gorm:"foreignKey:SedeID"                               json:"sede,omitempty"`
	ProductoID  uint      `gorm:"uniqueIndex:uq_inv_sede_producto;not null"        json:"producto_id"`
	Producto    Product   `gorm:"foreignKey:ProductoID"                           json:"producto,omitempty"`
	StockActual int       `gorm:"not null;default:0"                              json:"stock_actual"`
	StockMinimo int       `gorm:"not null;default:0"                              json:"stock_minimo"`
	UpdatedAt   time.Time `gorm:"autoUpdateTime"                                  json:"updated_at"`
}

func (Inventory) TableName() string { return "inventario" }

// ----------------------------------------------------------------

type TipoMovimiento string

const (
	TipoEntrada        TipoMovimiento = "entrada"
	TipoDescuentoVenta TipoMovimiento = "descuento_venta"
	TipoAjusteManual   TipoMovimiento = "ajuste_manual"
)

type InventoryMovement struct {
	ID           uint           `gorm:"primaryKey"                                                          json:"id"`
	InventarioID uint           `gorm:"not null"                                                            json:"inventario_id"`
	Inventario   Inventory      `gorm:"foreignKey:InventarioID"                                             json:"inventario,omitempty"`
	UsuarioID    uint           `gorm:"not null"                                                            json:"usuario_id"`
	Usuario      User           `gorm:"foreignKey:UsuarioID"                                                json:"usuario,omitempty"`
	Tipo         TipoMovimiento `gorm:"type:enum('entrada','descuento_venta','ajuste_manual');not null"      json:"tipo"`
	Cantidad     int            `gorm:"not null"                                                            json:"cantidad"`
	Motivo       string         `gorm:"type:text"                                                           json:"motivo"`
	Fecha        time.Time      `gorm:"autoCreateTime"                                                      json:"fecha"`
}

func (InventoryMovement) TableName() string { return "movimientos_inventario" }
