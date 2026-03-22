package repository

import (
	"gorm.io/gorm"

	"bar-inventory-api/internal/models"
)

// ProductRepository define el contrato de acceso a datos para productos.
type ProductRepository interface {
	FindAll() ([]models.Product, error)
	FindByID(id uint) (*models.Product, error)
	FindByCategoryID(categoryID uint) ([]models.Product, error)
	Create(p *models.Product) error
	Update(p *models.Product) error
	Delete(id uint) error
}

type productRepository struct {
	db *gorm.DB
}

func NewProductRepository(db *gorm.DB) ProductRepository {
	return &productRepository{db: db}
}

func (r *productRepository) FindAll() ([]models.Product, error) {
	var products []models.Product
	return products, r.db.Preload("Categoria").Find(&products).Error
}

func (r *productRepository) FindByID(id uint) (*models.Product, error) {
	var product models.Product
	return &product, r.db.Preload("Categoria").First(&product, id).Error
}

func (r *productRepository) FindByCategoryID(categoryID uint) ([]models.Product, error) {
	var products []models.Product
	return products, r.db.Where("categoria_id = ?", categoryID).Find(&products).Error
}

func (r *productRepository) Create(p *models.Product) error {
	return r.db.Create(p).Error
}

func (r *productRepository) Update(p *models.Product) error {
	return r.db.Save(p).Error
}

func (r *productRepository) Delete(id uint) error {
	return r.db.Delete(&models.Product{}, id).Error
}
