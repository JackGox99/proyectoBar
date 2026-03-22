package services

import (
	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/repository"
)

// OrderService define el contrato de lógica de negocio para pedidos.
type OrderService interface {
	List() ([]models.Order, error)
	GetByID(id uint) (*models.Order, error)
	Create(o *models.Order) error
	Update(o *models.Order) error
	// AddItem agrega un producto al pedido y registra el precio snapshot al momento.
	// TODO (HU-Pedidos): validar que el pedido esté en estado "abierto".
	AddItem(orderID uint, item *models.OrderItem) error
	// Pay cierra el pedido y genera el registro de pago en una transacción.
	// TODO (HU-Pedidos): descontar inventario y cambiar estado a "pagado".
	Pay(orderID uint, payment *models.Payment) error
}

type orderService struct {
	repo        repository.OrderRepository
	paymentRepo repository.PaymentRepository
}

func NewOrderService(repo repository.OrderRepository, paymentRepo repository.PaymentRepository) OrderService {
	return &orderService{repo: repo, paymentRepo: paymentRepo}
}

func (s *orderService) List() ([]models.Order, error) {
	return s.repo.FindAll()
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

func (s *orderService) AddItem(orderID uint, item *models.OrderItem) error {
	item.PedidoID = orderID
	return s.repo.AddItem(item)
}

func (s *orderService) Pay(orderID uint, payment *models.Payment) error {
	payment.PedidoID = orderID
	return s.paymentRepo.Create(payment)
}
