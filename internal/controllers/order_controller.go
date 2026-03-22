package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"bar-inventory-api/internal/services"
)

// OrderController maneja las peticiones HTTP de pedidos.
type OrderController struct {
	service services.OrderService
}

func NewOrderController(service services.OrderService) *OrderController {
	return &OrderController{service: service}
}

func (oc *OrderController) List(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (oc *OrderController) GetByID(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (oc *OrderController) Create(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (oc *OrderController) Update(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (oc *OrderController) AddItem(c *gin.Context) {
	// TODO (HU-Pedidos): agregar item con precio_unitario snapshot del producto actual.
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (oc *OrderController) Pay(c *gin.Context) {
	// TODO (HU-Pedidos): cerrar pedido, registrar pago, descontar inventario.
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}
