package repository

import (
	"errors"

	"gorm.io/gorm"

	"bar-inventory-api/internal/models"
)

var (
	// ErrOrderAlreadyClosed se retorna cuando se intenta operar sobre una orden cerrada.
	ErrOrderAlreadyClosed = errors.New("order is already closed")
	// ErrStockDiscrepancy se retorna cuando el stock de un ítem es negativo al finalizar.
	ErrStockDiscrepancy = errors.New("stock discrepancy detected")
)

// OrderRepository define el contrato de acceso a datos para pedidos.
type OrderRepository interface {
	FindAll() ([]models.Order, error)
	FindByID(id uint) (*models.Order, error)
	FindByVenueID(venueID uint) ([]models.Order, error)
	FindByStatus(status models.EstadoPedido) ([]models.Order, error)
	Create(o *models.Order) error
	Update(o *models.Order) error
	Delete(id uint) error
	AddItem(item *models.OrderItem) error
	RemoveItem(orderID, itemID uint) error
	// FinalizeOrder ejecuta en una sola transacción: verifica stock, crea el
	// registro de pago y cierra la orden. Retorna ErrStockDiscrepancy si algún
	// ítem tiene stock negativo (error de concurrencia).
	FinalizeOrder(orderID uint, payment *models.Payment) error
}

type orderRepository struct {
	db *gorm.DB
}

func NewOrderRepository(db *gorm.DB) OrderRepository {
	return &orderRepository{db: db}
}

func (r *orderRepository) FindAll() ([]models.Order, error) {
	var orders []models.Order
	return orders, r.db.Preload("Sede").Preload("Usuario").Find(&orders).Error
}

func (r *orderRepository) FindByID(id uint) (*models.Order, error) {
	var order models.Order
	return &order, r.db.
		Preload("Sede").
		Preload("Usuario").
		Preload("Items.Producto").
		First(&order, id).Error
}

func (r *orderRepository) FindByVenueID(venueID uint) ([]models.Order, error) {
	var orders []models.Order
	return orders, r.db.
		Where("sede_id = ?", venueID).
		Preload("Sede").
		Preload("Usuario").
		Order("created_at DESC").
		Find(&orders).Error
}

func (r *orderRepository) Delete(id uint) error {
	return r.db.Delete(&models.Order{}, id).Error
}

func (r *orderRepository) FindByStatus(status models.EstadoPedido) ([]models.Order, error) {
	var orders []models.Order
	return orders, r.db.Where("estado = ?", status).Find(&orders).Error
}

func (r *orderRepository) Create(o *models.Order) error {
	return r.db.Create(o).Error
}

func (r *orderRepository) Update(o *models.Order) error {
	return r.db.Save(o).Error
}

func (r *orderRepository) AddItem(item *models.OrderItem) error {
	return r.db.Create(item).Error
}

func (r *orderRepository) RemoveItem(orderID, itemID uint) error {
	result := r.db.Where("id = ? AND pedido_id = ?", itemID, orderID).Delete(&models.OrderItem{})
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

// FinalizeOrder ejecuta en una sola transacción de BD (HU026):
// 1. Valida que la orden esté abierta.
// 2. Verifica que ningún ítem tenga stock negativo (concurrencia).
// 3. Calcula el total sumando precio × cantidad de cada ítem.
// 4. Crea el registro de pago en `pagos`.
// 5. Cambia el estado de la orden a "pagado".
func (r *orderRepository) FinalizeOrder(orderID uint, payment *models.Payment) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var order models.Order
		if err := tx.Preload("Items").First(&order, orderID).Error; err != nil {
			return err
		}
		if order.Estado != models.EstadoAbierto {
			return ErrOrderAlreadyClosed
		}

		// Concurrency check: stock deducted at add-item time; if negative now,
		// another transaction over-committed the same units.
		for _, item := range order.Items {
			var inv models.Inventory
			if err := tx.Where("sede_id = ? AND producto_id = ?", order.SedeID, item.ProductoID).
				First(&inv).Error; err != nil {
				return err
			}
			if inv.StockActual < 0 {
				return ErrStockDiscrepancy
			}
		}

		var total float64
		for _, item := range order.Items {
			total += item.PrecioUnitario * float64(item.Cantidad)
		}
		payment.PedidoID = orderID
		payment.Total = total

		if err := tx.Create(payment).Error; err != nil {
			return err
		}

		return tx.Model(&models.Order{}).
			Where("id = ?", orderID).
			UpdateColumn("estado", models.EstadoPagado).Error
	})
}
