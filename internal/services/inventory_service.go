package services

import (
	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/repository"
)

// InventoryService define el contrato de lógica de negocio para inventario.
type InventoryService interface {
	List() ([]models.Inventory, error)
	GetByID(id uint) (*models.Inventory, error)
	Create(inv *models.Inventory) error
	Update(inv *models.Inventory) error
	// AddMovement registra un movimiento y actualiza el stock_actual en la misma transacción.
	// TODO (HU-Inventario): envolver en db.Transaction para garantizar consistencia.
	AddMovement(inventoryID uint, mov *models.InventoryMovement) error
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
