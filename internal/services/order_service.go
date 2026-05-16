package services

import (
	"errors"
	"fmt"

	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/repository"
)

var (
	ErrOrderNotOpen       = errors.New("order is not open")
	ErrOrderNotOwner      = errors.New("not the order owner")
	ErrInvalidItemQuantity = errors.New("quantity must be greater than zero")
)

// ErrInsufficientStock se retorna cuando el stock disponible es menor al solicitado.
// Lleva el campo Available para que el controller pueda incluirlo en el mensaje al cliente.
type ErrInsufficientStock struct {
	Available int
}

func (e *ErrInsufficientStock) Error() string {
	if e.Available == 0 {
		return "product is out of stock at this location"
	}
	return fmt.Sprintf("only %d unit(s) available", e.Available)
}

// OrderService define el contrato de lógica de negocio para pedidos.
type OrderService interface {
	List() ([]models.Order, error)
	ListByVenue(venueID uint) ([]models.Order, error)
	GetByID(id uint) (*models.Order, error)
	Create(o *models.Order) error
	Update(o *models.Order) error
	// Cancel elimina un pedido abierto. Devuelve ErrOrderNotOwner si el
	// requesterID no es el dueño, o ErrOrderNotOpen si ya no está abierto.
	Cancel(orderID, requesterID uint) error
	// CancelForce elimina cualquier pedido abierto sin validar propiedad (admin).
	CancelForce(orderID uint) error
	// AddItem agrega un producto al pedido validando stock disponible (HU023).
	// Snapshot del precio tomado del precio actual del producto en inventario.
	AddItem(orderID uint, item *models.OrderItem) error
	// Pay cierra el pedido y genera el registro de pago en una transacción.
	Pay(orderID uint, payment *models.Payment) error
}

type orderService struct {
	repo          repository.OrderRepository
	paymentRepo   repository.PaymentRepository
	inventoryRepo repository.InventoryRepository
}

func NewOrderService(
	repo repository.OrderRepository,
	paymentRepo repository.PaymentRepository,
	inventoryRepo repository.InventoryRepository,
) OrderService {
	return &orderService{repo: repo, paymentRepo: paymentRepo, inventoryRepo: inventoryRepo}
}

func (s *orderService) List() ([]models.Order, error) {
	return s.repo.FindAll()
}

func (s *orderService) ListByVenue(venueID uint) ([]models.Order, error) {
	return s.repo.FindByVenueID(venueID)
}

func (s *orderService) GetByID(id uint) (*models.Order, error) {
	return s.repo.FindByID(id)
}

func (s *orderService) Create(o *models.Order) error {
	o.Estado = models.EstadoAbierto
	return s.repo.Create(o)
}

func (s *orderService) Update(o *models.Order) error {
	return s.repo.Update(o)
}

func (s *orderService) Cancel(orderID, requesterID uint) error {
	order, err := s.repo.FindByID(orderID)
	if err != nil {
		return err
	}
	if order.UsuarioID != requesterID {
		return ErrOrderNotOwner
	}
	if order.Estado != models.EstadoAbierto {
		return ErrOrderNotOpen
	}
	return s.repo.Delete(orderID)
}

func (s *orderService) CancelForce(orderID uint) error {
	order, err := s.repo.FindByID(orderID)
	if err != nil {
		return err
	}
	if order.Estado != models.EstadoAbierto {
		return ErrOrderNotOpen
	}
	return s.repo.Delete(orderID)
}

// AddItem valida disponibilidad de stock (HU023) antes de registrar el ítem.
// - Cantidad debe ser > 0.
// - El pedido debe estar en estado "abierto".
// - El stock en la sede del pedido debe ser >= cantidad solicitada.
// - El precio unitario se toma del precio actual del producto (snapshot).
func (s *orderService) AddItem(orderID uint, item *models.OrderItem) error {
	if item.Cantidad <= 0 {
		return ErrInvalidItemQuantity
	}

	order, err := s.repo.FindByID(orderID)
	if err != nil {
		return err
	}
	if order.Estado != models.EstadoAbierto {
		return ErrOrderNotOpen
	}

	inv, err := s.inventoryRepo.FindByVenueAndProduct(order.SedeID, item.ProductoID)
	if err != nil {
		return err
	}
	if inv == nil || inv.StockActual < item.Cantidad {
		avail := 0
		if inv != nil {
			avail = inv.StockActual
		}
		return &ErrInsufficientStock{Available: avail}
	}

	item.PrecioUnitario = inv.Producto.Precio
	item.PedidoID = orderID
	return s.repo.AddItem(item)
}

func (s *orderService) Pay(orderID uint, payment *models.Payment) error {
	payment.PedidoID = orderID
	return s.paymentRepo.Create(payment)
}
