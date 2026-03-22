package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"bar-inventory-api/internal/services"
)

// InventoryController maneja las peticiones HTTP de inventario.
type InventoryController struct {
	service services.InventoryService
}

func NewInventoryController(service services.InventoryService) *InventoryController {
	return &InventoryController{service: service}
}

func (ic *InventoryController) List(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
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
