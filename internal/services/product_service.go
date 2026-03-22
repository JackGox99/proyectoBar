package services

import (
	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/repository"
)

// ProductService define el contrato de lógica de negocio para productos.
type ProductService interface {
	List() ([]models.Product, error)
	GetByID(id uint) (*models.Product, error)
	ListByCategory(categoryID uint) ([]models.Product, error)
	Create(p *models.Product) error
	Update(p *models.Product) error
	Delete(id uint) error
}

type productService struct {
	repo        repository.ProductRepository
	categoryRepo repository.CategoryRepository
}

// NewProductService inyecta ambos repositorios — el de categoría valida la FK antes de crear.
func NewProductService(repo repository.ProductRepository, categoryRepo repository.CategoryRepository) ProductService {
	return &productService{repo: repo, categoryRepo: categoryRepo}
}

func (s *productService) List() ([]models.Product, error) {
	return s.repo.FindAll()
}

func (s *productService) GetByID(id uint) (*models.Product, error) {
	return s.repo.FindByID(id)
}

func (s *productService) ListByCategory(categoryID uint) ([]models.Product, error) {
	return s.repo.FindByCategoryID(categoryID)
}

// Create valida que la categoría exista antes de persistir el producto.
// TODO: agregar validación de precio > 0.
func (s *productService) Create(p *models.Product) error {
	if _, err := s.categoryRepo.FindByID(p.CategoriaID); err != nil {
		return err
	}
	return s.repo.Create(p)
}

func (s *productService) Update(p *models.Product) error {
	return s.repo.Update(p)
}

func (s *productService) Delete(id uint) error {
	return s.repo.Delete(id)
}
