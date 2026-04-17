package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"bar-inventory-api/internal/middleware"
	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/services"
)

// InventoryController maneja las peticiones HTTP de inventario.
type InventoryController struct {
	service services.InventoryService
}

func NewInventoryController(service services.InventoryService) *InventoryController {
	return &InventoryController{service: service}
}

// List retorna el inventario aplicando RBAC por sede (HU017).
// - Admin: ve el inventario global o puede filtrar por sede con ?venue_id=.
// - Cajero: solo ve el inventario de su sede asignada (SedeID del JWT);
//   el parámetro ?venue_id= se ignora para garantizar la independencia operativa.
func (ic *InventoryController) List(c *gin.Context) {
	raw, exists := c.Get(middleware.CtxClaims)
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
		return
	}
	claims, ok := raw.(*services.TokenClaims)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid authentication context"})
		return
	}

	var (
		items []models.Inventory
		err   error
	)

	switch claims.Rol {
	case models.RolAdmin:
		if q := c.Query("venue_id"); q != "" {
			venueID, parseErr := strconv.ParseUint(q, 10, 64)
			if parseErr != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid venue_id"})
				return
			}
			items, err = ic.service.ListByVenue(uint(venueID))
		} else {
			items, err = ic.service.List()
		}
	case models.RolCajero:
		if claims.SedeID == nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "cashier has no assigned location"})
			return
		}
		items, err = ic.service.ListByVenue(*claims.SedeID)
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: insufficient privileges"})
		return
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, items)
}

func (ic *InventoryController) GetByID(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (ic *InventoryController) Create(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (ic *InventoryController) Update(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (ic *InventoryController) AddMovement(c *gin.Context) {
	// TODO (HU-Inventario): registrar movimiento y actualizar stock en transacción.
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}
