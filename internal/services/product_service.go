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
	// Create registra el producto y crea filas de inventario con stock 0
	// únicamente en las sedes seleccionadas por el admin. Debe recibir al
	// menos una sede válida.
	Create(p *models.Product, venueIDs []uint) error
	Update(p *models.Product) error
	UpdatePrice(id uint, price float64) error // HU014
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

// validatePricing aplica las reglas de negocio sobre los precios del producto:
// ambos deben ser enteros positivos y el costo de compra debe ser estrictamente
// menor al precio de venta (el bar nunca debe vender a pérdida).
func validatePricing(costoCompra, precioVenta float64) error {
	if precioVenta <= 0 || precioVenta != float64(int(precioVenta)) {
		return ErrInvalidPrice
	}
	if costoCompra <= 0 || costoCompra != float64(int(costoCompra)) {
		return ErrInvalidPurchaseCost
	}
	if costoCompra >= precioVenta {
		return ErrPurchaseExceedsSale
	}
	return nil
}

// Create valida nombre único, existencia de la categoría, persiste el producto
// y crea filas de inventario con stock 0 únicamente en las sedes seleccionadas
// por el admin (deduplicadas). El producto se rechaza si no se pasa ninguna sede
// o si alguna sede referenciada no existe.
func (s *productService) Create(p *models.Product, venueIDs []uint) error {
	p.Nombre = strings.TrimSpace(p.Nombre)
	if p.Nombre == "" {
		return ErrProductNameRequired
	}

	if err := validatePricing(p.CostoCompra, p.Precio); err != nil {
		return err
	}

	// Deduplicar y validar que se pase al menos una sede.
	seen := make(map[uint]struct{}, len(venueIDs))
	uniqueVenues := make([]uint, 0, len(venueIDs))
	for _, id := range venueIDs {
		if id == 0 {
			continue
		}
		if _, dup := seen[id]; dup {
			continue
		}
		seen[id] = struct{}{}
		uniqueVenues = append(uniqueVenues, id)
	}
	if len(uniqueVenues) == 0 {
		return ErrVenuesRequired
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

	// Validar cada sede antes de persistir nada.
	for _, vid := range uniqueVenues {
		if _, err := s.venueRepo.FindByID(vid); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrSedeNotFound
			}
			return err
		}
	}

	// Persistir producto.
	if err := s.repo.Create(p); err != nil {
		return err
	}

	// Crear inventario con stock 0 solo en las sedes seleccionadas.
	for _, vid := range uniqueVenues {
		inv := &models.Inventory{
			SedeID:      vid,
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

// Update valida nombre no vacío, unicidad y reglas de precios
// (excluyendo el propio producto en la comprobación de unicidad).
func (s *productService) Update(p *models.Product) error {
	p.Nombre = strings.TrimSpace(p.Nombre)
	if p.Nombre == "" {
		return ErrProductNameRequired
	}

	if err := validatePricing(p.CostoCompra, p.Precio); err != nil {
		return err
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

// UpdatePrice actualiza únicamente el precio de venta de un producto (HU014).
// Valida que el precio sea un entero positivo y que siga siendo mayor al costo
// de compra ya registrado; de lo contrario el negocio vendería a pérdida.
func (s *productService) UpdatePrice(id uint, price float64) error {
	if price <= 0 || price != float64(int(price)) {
		return ErrInvalidPrice
	}

	product, err := s.repo.FindByID(id)
	if err != nil {
		return err
	}

	if product.CostoCompra > 0 && price <= product.CostoCompra {
		return ErrPurchaseExceedsSale
	}

	product.Precio = price
	return s.repo.Update(product)
}

func (s *productService) Delete(id uint) error {
	return s.repo.Delete(id)
}
