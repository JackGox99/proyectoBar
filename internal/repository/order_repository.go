package repository

import (
	"gorm.io/gorm"

	"bar-inventory-api/internal/models"
)

// OrderRepository define el contrato de acceso a datos para pedidos.
type OrderRepository interface {
	FindAll() ([]models.Order, error)
	FindByID(id uint) (*models.Order, error)
	FindByVenueID(venueID uint) ([]models.Order, error)
	FindByStatus(status models.EstadoPedido) ([]models.Order, error)
	Create(o *models.Order) error
	Update(o *models.Order) error
	AddItem(item *models.OrderItem) error
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
	return &order, r.db.Preload("Sede").Preload("Usuario").First(&order, id).Error
}

func (r *orderRepository) FindByVenueID(venueID uint) ([]models.Order, error) {
	var orders []models.Order
	return orders, r.db.Where("sede_id = ?", venueID).Find(&orders).Error
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
