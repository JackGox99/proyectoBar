package repository

import (
	"gorm.io/gorm"

	"bar-inventory-api/internal/models"
)

// InventoryRepository define el contrato de acceso a datos para inventario.
type InventoryRepository interface {
	FindAll() ([]models.Inventory, error)
	FindByID(id uint) (*models.Inventory, error)
	FindByVenueID(venueID uint) ([]models.Inventory, error)
	FindByVenueAndProduct(venueID, productID uint) (*models.Inventory, error)
	Create(inv *models.Inventory) error
	Update(inv *models.Inventory) error
	AddMovement(mov *models.InventoryMovement) error
}

type inventoryRepository struct {
	db *gorm.DB
}

func NewInventoryRepository(db *gorm.DB) InventoryRepository {
	return &inventoryRepository{db: db}
}

func (r *inventoryRepository) FindAll() ([]models.Inventory, error) {
	var items []models.Inventory
	return items, r.db.Preload("Sede").Preload("Producto").Find(&items).Error
}

func (r *inventoryRepository) FindByID(id uint) (*models.Inventory, error) {
	var item models.Inventory
	return &item, r.db.Preload("Sede").Preload("Producto").First(&item, id).Error
}

func (r *inventoryRepository) FindByVenueID(venueID uint) ([]models.Inventory, error) {
	var items []models.Inventory
	return items, r.db.Where("sede_id = ?", venueID).Preload("Producto").Find(&items).Error
}

func (r *inventoryRepository) FindByVenueAndProduct(venueID, productID uint) (*models.Inventory, error) {
	var item models.Inventory
	return &item, r.db.Where("sede_id = ? AND producto_id = ?", venueID, productID).First(&item).Error
}

func (r *inventoryRepository) Create(inv *models.Inventory) error {
	return r.db.Create(inv).Error
}

func (r *inventoryRepository) Update(inv *models.Inventory) error {
	return r.db.Save(inv).Error
}

func (r *inventoryRepository) AddMovement(mov *models.InventoryMovement) error {
	return r.db.Create(mov).Error
}
