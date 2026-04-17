package repository

import (
	"gorm.io/gorm"

	"bar-inventory-api/internal/models"
)

// ProductRepository define el contrato de acceso a datos para productos.
type ProductRepository interface {
	FindAll() ([]models.Product, error)
	FindByID(id uint) (*models.Product, error)
	FindByName(name string) (*models.Product, error)
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

// FindByName busca un producto activo por nombre (HU016: ignora inactivos para
// permitir la reutilización de nombres tras eliminación lógica).
func (r *productRepository) FindByName(name string) (*models.Product, error) {
	var product models.Product
	return &product, r.db.Where("nombre = ? AND activo = ?", name, true).First(&product).Error
}

// FindAll retorna solo productos activos (HU016: eliminación lógica).
func (r *productRepository) FindAll() ([]models.Product, error) {
	var products []models.Product
	return products, r.db.Preload("Categoria").Where("activo = ?", true).Find(&products).Error
}

// FindByID retorna cualquier producto (activo o inactivo) para preservar
// integridad de reportes históricos (HU016).
func (r *productRepository) FindByID(id uint) (*models.Product, error) {
	var product models.Product
	return &product, r.db.Preload("Categoria").First(&product, id).Error
}

// FindByCategoryID retorna solo productos activos de la categoría (HU016).
func (r *productRepository) FindByCategoryID(categoryID uint) ([]models.Product, error) {
	var products []models.Product
	return products, r.db.Where("categoria_id = ? AND activo = ?", categoryID, true).Find(&products).Error
}

func (r *productRepository) Create(p *models.Product) error {
	return r.db.Create(p).Error
}

func (r *productRepository) Update(p *models.Product) error {
	return r.db.Save(p).Error
}

// Delete realiza eliminación lógica marcando activo = false (HU016).
// Preserva integridad referencial con reportes históricos de ventas.
func (r *productRepository) Delete(id uint) error {
	return r.db.Model(&models.Product{}).Where("id = ?", id).Update("activo", false).Error
}
