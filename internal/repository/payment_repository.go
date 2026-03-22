package repository

import (
	"gorm.io/gorm"

	"bar-inventory-api/internal/models"
)

// PaymentRepository define el contrato de acceso a datos para pagos.
type PaymentRepository interface {
	FindAll() ([]models.Payment, error)
	FindByOrderID(orderID uint) (*models.Payment, error)
	Create(p *models.Payment) error
}

type paymentRepository struct {
	db *gorm.DB
}

func NewPaymentRepository(db *gorm.DB) PaymentRepository {
	return &paymentRepository{db: db}
}

func (r *paymentRepository) FindAll() ([]models.Payment, error) {
	var payments []models.Payment
	return payments, r.db.Preload("Pedido").Preload("Usuario").Find(&payments).Error
}

func (r *paymentRepository) FindByOrderID(orderID uint) (*models.Payment, error) {
	var payment models.Payment
	return &payment, r.db.Where("pedido_id = ?", orderID).First(&payment).Error
}

func (r *paymentRepository) Create(p *models.Payment) error {
	return r.db.Create(p).Error
}
