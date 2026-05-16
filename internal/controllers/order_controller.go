package controllers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"bar-inventory-api/internal/middleware"
	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/services"
)

// OrderController maneja las peticiones HTTP de pedidos.
type OrderController struct {
	service services.OrderService
}

func NewOrderController(service services.OrderService) *OrderController {
	return &OrderController{service: service}
}

// List retorna los pedidos según RBAC:
// - Mesero: solo los pedidos de su sede asignada.
// - Admin: todos los pedidos.
func (oc *OrderController) List(c *gin.Context) {
	claims, ok := extractClaims(c)
	if !ok {
		return
	}

	switch claims.Rol {
	case models.RolMesero:
		if claims.SedeID == nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "waiter has no assigned location"})
			return
		}
		orders, err := oc.service.ListByVenue(*claims.SedeID)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, orders)
	case models.RolAdmin, models.RolCajero:
		orders, err := oc.service.List()
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
			return
		}
		c.JSON(http.StatusOK, orders)
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: insufficient privileges"})
	}
}

func (oc *OrderController) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}
	order, err := oc.service.GetByID(uint(id))
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, order)
}

// Create abre un nuevo pedido (HU021).
// Mesero: sede tomada del JWT. Admin: requiere venue_id en el body.
func (oc *OrderController) Create(c *gin.Context) {
	claims, ok := extractClaims(c)
	if !ok {
		return
	}

	order := models.Order{UsuarioID: claims.UserID}

	switch claims.Rol {
	case models.RolMesero:
		if claims.SedeID == nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "waiter has no assigned location"})
			return
		}
		order.SedeID = *claims.SedeID
	case models.RolAdmin:
		var body struct {
			VenueID uint `json:"venue_id" binding:"required"`
		}
		if err := c.ShouldBindJSON(&body); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "venue_id is required"})
			return
		}
		order.SedeID = body.VenueID
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "only waiters and admins can open orders"})
		return
	}

	if err := oc.service.Create(&order); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	created, err := oc.service.GetByID(order.ID)
	if err != nil {
		c.JSON(http.StatusCreated, order)
		return
	}
	c.JSON(http.StatusCreated, created)
}

func (oc *OrderController) Update(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

// Cancel elimina un pedido abierto (HU021 — botón "Cancel Order").
// El mesero solo puede cancelar sus propios pedidos en estado abierto.
func (oc *OrderController) Cancel(c *gin.Context) {
	claims, ok := extractClaims(c)
	if !ok {
		return
	}

	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}

	var cancelErr error
	if claims.Rol == models.RolAdmin {
		cancelErr = oc.service.CancelForce(uint(id))
	} else {
		cancelErr = oc.service.Cancel(uint(id), claims.UserID)
	}
	if err := cancelErr; err != nil {
		switch {
		case errors.Is(err, services.ErrOrderNotOwner):
			c.JSON(http.StatusForbidden, gin.H{"error": "you can only cancel your own orders"})
		case errors.Is(err, services.ErrOrderNotOpen):
			c.JSON(http.StatusConflict, gin.H{"error": "order is not open"})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "order cancelled"})
}

// AddItem agrega un producto a un pedido abierto con validación de stock (HU023).
// Requiere rol mesero o admin. El precio se toma del producto actual (snapshot).
func (oc *OrderController) AddItem(c *gin.Context) {
	claims, ok := extractClaims(c)
	if !ok {
		return
	}
	if claims.Rol != models.RolMesero && claims.Rol != models.RolAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: insufficient privileges"})
		return
	}

	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}

	var body struct {
		ProductoID uint   `json:"product_id" binding:"required"`
		Cantidad   int    `json:"cantidad"   binding:"required"`
		Notas      string `json:"notas"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "product_id and cantidad are required"})
		return
	}

	item := models.OrderItem{
		ProductoID: body.ProductoID,
		Cantidad:   body.Cantidad,
		Notas:      body.Notas,
	}

	if err := oc.service.AddItem(uint(orderID), &item); err != nil {
		var stockErr *services.ErrInsufficientStock
		switch {
		case errors.As(err, &stockErr):
			c.JSON(http.StatusConflict, gin.H{"error": stockErr.Error()})
		case errors.Is(err, services.ErrOrderNotOpen):
			c.JSON(http.StatusConflict, gin.H{"error": "order is not open"})
		case errors.Is(err, services.ErrInvalidItemQuantity):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusCreated, item)
}

// RemoveItem elimina un ítem de un pedido abierto (HU024).
func (oc *OrderController) RemoveItem(c *gin.Context) {
	claims, ok := extractClaims(c)
	if !ok {
		return
	}
	if claims.Rol != models.RolMesero && claims.Rol != models.RolAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: insufficient privileges"})
		return
	}

	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}
	itemID, err := strconv.ParseUint(c.Param("itemId"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid item id"})
		return
	}

	if err := oc.service.RemoveItem(uint(orderID), uint(itemID)); err != nil {
		switch {
		case errors.Is(err, services.ErrOrderNotOpen):
			c.JSON(http.StatusConflict, gin.H{"error": "order is not open"})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "item not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "item removed"})
}

// Pay registra el pago de un pedido abierto y lo cierra (HU025).
// Solo cajero y admin pueden procesar pagos.
// Finalize procesa el pago atómico de un pedido (HU026).
// Valida método, verifica stock y cierra la orden en una sola transacción.
func (oc *OrderController) Finalize(c *gin.Context) {
	claims, ok := extractClaims(c)
	if !ok {
		return
	}
	if claims.Rol != models.RolCajero && claims.Rol != models.RolAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "only cashiers and admins can finalize payments"})
		return
	}

	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}

	var body struct {
		MetodoPago models.MetodoPago `json:"metodo_pago" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "metodo_pago is required"})
		return
	}

	payment := models.Payment{
		UsuarioID:  claims.UserID,
		MetodoPago: body.MetodoPago,
	}

	if err := oc.service.Finalize(uint(orderID), &payment); err != nil {
		switch {
		case errors.Is(err, services.ErrOrderNotOpen):
			c.JSON(http.StatusConflict, gin.H{"error": "order is not open"})
		case errors.Is(err, services.ErrInvalidPaymentMethod):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrStockDiscrepancy):
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, payment)
}

func (oc *OrderController) Pay(c *gin.Context) {
	claims, ok := extractClaims(c)
	if !ok {
		return
	}
	if claims.Rol != models.RolCajero && claims.Rol != models.RolAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "only cashiers and admins can process payments"})
		return
	}

	orderID, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}

	var body struct {
		MetodoPago models.MetodoPago `json:"metodo_pago" binding:"required"`
	}
	if err := c.ShouldBindJSON(&body); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "metodo_pago is required"})
		return
	}

	payment := models.Payment{
		UsuarioID:  claims.UserID,
		MetodoPago: body.MetodoPago,
	}

	if err := oc.service.Pay(uint(orderID), &payment); err != nil {
		switch {
		case errors.Is(err, services.ErrOrderNotOpen):
			c.JSON(http.StatusConflict, gin.H{"error": "order is not open"})
		case errors.Is(err, services.ErrInvalidPaymentMethod):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, gorm.ErrRecordNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, payment)
}

// extractClaims extrae los JWT claims del contexto Gin y responde 401 si faltan.
func extractClaims(c *gin.Context) (*services.TokenClaims, bool) {
	raw, exists := c.Get(middleware.CtxClaims)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return nil, false
	}
	claims, ok := raw.(*services.TokenClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authentication context"})
		return nil, false
	}
	return claims, true
}
