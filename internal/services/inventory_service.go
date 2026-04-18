package services

import (
	"errors"

	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/repository"
)

// Errores de dominio para inventario (HU018).
var (
	ErrInvalidQuantity  = errors.New("quantity must be a positive integer")
	ErrProductNotFound  = errors.New("product not found")
	ErrVenueRequired    = errors.New("venue_id is required")
)

// InventoryService define el contrato de lógica de negocio para inventario.
type InventoryService interface {
	List() ([]models.Inventory, error)
	ListByVenue(venueID uint) ([]models.Inventory, error) // HU017
	GetByID(id uint) (*models.Inventory, error)
	Create(inv *models.Inventory) error
	Update(inv *models.Inventory) error
	// AddMovement registra un movimiento y actualiza el stock_actual en la misma transacción.
	// TODO (HU-Inventario): envolver en db.Transaction para garantizar consistencia.
	AddMovement(inventoryID uint, mov *models.InventoryMovement) error
	// AddStock registra una entrada manual de stock (HU018).
	AddStock(venueID, productID uint, quantity int, userID uint) (*models.Inventory, error)
}

type inventoryService struct {
	repo repository.InventoryRepository
}

func NewInventoryService(repo repository.InventoryRepository) InventoryService {
	return &inventoryService{repo: repo}
}

func (s *inventoryService) List() ([]models.Inventory, error) {
	return s.repo.FindAll()
}

// ListByVenue retorna el inventario filtrado por sede (HU017).
func (s *inventoryService) ListByVenue(venueID uint) ([]models.Inventory, error) {
	return s.repo.FindByVenueID(venueID)
}

func (s *inventoryService) GetByID(id uint) (*models.Inventory, error) {
	return s.repo.FindByID(id)
}

func (s *inventoryService) Create(inv *models.Inventory) error {
	return s.repo.Create(inv)
}

func (s *inventoryService) Update(inv *models.Inventory) error {
	return s.repo.Update(inv)
}

func (s *inventoryService) AddMovement(inventoryID uint, mov *models.InventoryMovement) error {
	mov.InventarioID = inventoryID
	return s.repo.AddMovement(mov)
}

// AddStock valida los campos y delega al repositorio la suma atómica (HU018).
// - La cantidad debe ser un entero positivo (no decimales, no cero, no negativos).
// - La sede y el producto son obligatorios.
func (s *inventoryService) AddStock(venueID, productID uint, quantity int, userID uint) (*models.Inventory, error) {
	if venueID == 0 {
		return nil, ErrVenueRequired
	}
	if productID == 0 {
		return nil, ErrProductNotFound
	}
	if quantity <= 0 {
		return nil, ErrInvalidQuantity
	}

	inv, err := s.repo.AddStock(venueID, productID, quantity, userID)
	if err != nil {
		if errors.Is(err, repository.ErrProductNotFound) {
			return nil, ErrProductNotFound
		}
		return nil, err
	}
	return inv, nil
}
