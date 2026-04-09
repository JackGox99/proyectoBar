package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"bar-inventory-api/internal/services"
)

// VenueController expone los endpoints de solo-lectura de sedes (HU008).
type VenueController struct {
	service services.VenueService
}

func NewVenueController(service services.VenueService) *VenueController {
	return &VenueController{service: service}
}

// List devuelve todas las sedes activas. Usado por el selector "Location"
// del formulario de creación de usuarios en el frontend.
func (vc *VenueController) List(c *gin.Context) {
	venues, err := vc.service.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, venues)
}
