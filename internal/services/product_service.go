package services

import (
	"errors"
	"strings"

	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/repository"

	"gorm.io/gorm"
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
	repo          repository.ProductRepository
	categoryRepo  repository.CategoryRepository
	venueRepo     repository.VenueRepository
	inventoryRepo repository.InventoryRepository
}

// NewProductService inyecta los repositorios necesarios.
// venueRepo e inventoryRepo permiten crear registros de inventario con stock 0
// en cada sede al registrar un producto (HU013).
func NewProductService(
	repo repository.ProductRepository,
	categoryRepo repository.CategoryRepository,
	venueRepo repository.VenueRepository,
	inventoryRepo repository.InventoryRepository,
) ProductService {
	return &productService{
		repo:          repo,
		categoryRepo:  categoryRepo,
		venueRepo:     venueRepo,
		inventoryRepo: inventoryRepo,
	}
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

// Create valida nombre único, existencia de la categoría, persiste el producto
// y crea automáticamente un registro de inventario con stock 0 en cada sede (HU013).
func (s *productService) Create(p *models.Product) error {
	p.Nombre = strings.TrimSpace(p.Nombre)
	if p.Nombre == "" {
		return ErrProductNameRequired
	}

	// Validar nombre único.
	if existing, err := s.repo.FindByName(p.Nombre); err == nil && existing != nil {
		return ErrProductNameTaken
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	// Validar que la categoría exista.
	if _, err := s.categoryRepo.FindByID(p.CategoriaID); err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return ErrCategoryNotFound
		}
		return err
	}

	// Persistir producto.
	if err := s.repo.Create(p); err != nil {
		return err
	}

	// Auto-crear inventario con stock 0 en cada sede activa (Galerías, Restrepo, Zona T).
	venues, err := s.venueRepo.FindAll()
	if err != nil {
		return err
	}
	for _, v := range venues {
		inv := &models.Inventory{
			SedeID:      v.ID,
			ProductoID:  p.ID,
			StockActual: 0,
			StockMinimo: 0,
		}
		if err := s.inventoryRepo.Create(inv); err != nil {
			return err
		}
	}

	return nil
}

// Update valida nombre no vacío y unicidad (excluyendo el propio producto).
func (s *productService) Update(p *models.Product) error {
	p.Nombre = strings.TrimSpace(p.Nombre)
	if p.Nombre == "" {
		return ErrProductNameRequired
	}

	if existing, err := s.repo.FindByName(p.Nombre); err == nil && existing != nil && existing.ID != p.ID {
		return ErrProductNameTaken
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	if p.CategoriaID != 0 {
		if _, err := s.categoryRepo.FindByID(p.CategoriaID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrCategoryNotFound
			}
			return err
		}
	}

	return s.repo.Update(p)
}

func (s *productService) Delete(id uint) error {
	return s.repo.Delete(id)
}
