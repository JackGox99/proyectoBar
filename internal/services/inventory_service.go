package services

import (
	"errors"
	"strings"

	"gorm.io/gorm"

	"bar-inventory-api/internal/algorithms"
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
	// ListEntryMovements retorna las entradas manuales para el historial (HU020).
	// venueID nil = sin filtro (admin viendo todas las sedes).
	ListEntryMovements(venueID *uint, productSearch string) ([]models.InventoryMovement, error)
	// SearchByProductName busca un ítem de inventario por nombre exacto de producto
	// usando MergeSort + BinarySearch (ver algorithms/mergesort.go y binarysearch.go).
	// El parámetro algo selecciona la variante: "iterative" o "recursive".
	// Si algo es vacío o desconocido, usa "recursive" por defecto.
	// Retorna gorm.ErrRecordNotFound si no existe ningún ítem con ese nombre en la sede.
	SearchByProductName(venueID uint, name string, algo string) (*models.Inventory, error)
}

// Constantes para las variantes de binary search expuestas a controllers / API.
// Se usan para comparar contra el parámetro ?algo= del endpoint de búsqueda.
const (
	AlgoIterative = "iterative"
	AlgoRecursive = "recursive"
)

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

// ListEntryMovements delega al repositorio el listado de entradas (HU020).
// El controller resuelve el RBAC (cajero = solo su sede); aquí solo se pasa el filtro.
func (s *inventoryService) ListEntryMovements(venueID *uint, productSearch string) ([]models.InventoryMovement, error) {
	return s.repo.FindEntryMovements(venueID, productSearch)
}

// SearchByProductName busca un ítem de inventario por nombre de producto usando
// MergeSort + BinarySearch (variante seleccionable):
//  1. Obtiene todo el inventario de la sede (O(n) en BD).
//  2. Ordena el slice por nombre de producto con MergeSort (O(n log n)).
//  3. Aplica binary search sobre el slice ordenado (O(log n)).
//     - algo == "iterative"  → BinarySearchIterative  (loop con low/high)
//     - algo == "recursive"  → BinarySearchRecursive  (llamada recursiva, default)
//
// Las dos variantes están expuestas para ilustrar en la UI la diferencia
// iterativo/recursivo (paralelo al ejemplo del Factorial visto en clase).
func (s *inventoryService) SearchByProductName(venueID uint, name string, algo string) (*models.Inventory, error) {
	items, err := s.repo.FindByVenueID(venueID)
	if err != nil {
		return nil, err
	}

	// Paso 1: ordenar con MergeSort para cumplir el prerequisito del binary search.
	sorted := algorithms.MergeSort(items, func(a, b models.Inventory) bool {
		return strings.ToLower(a.Producto.Nombre) < strings.ToLower(b.Producto.Nombre)
	})

	// Paso 2: búsqueda binaria — variante elegida por el caller.
	keyFn := func(inv models.Inventory) string { return inv.Producto.Nombre }
	var idx int
	if algo == AlgoIterative {
		idx = algorithms.BinarySearchIterative(sorted, name, keyFn)
	} else {
		idx = algorithms.BinarySearchRecursive(sorted, name, keyFn)
	}
	if idx == -1 {
		return nil, gorm.ErrRecordNotFound
	}
	return &sorted[idx], nil
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
