package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"bar-inventory-api/internal/services"
)

// ReportController maneja las peticiones HTTP de reportes.
type ReportController struct {
	service services.ReportService
}

func NewReportController(service services.ReportService) *ReportController {
	return &ReportController{service: service}
}

func (rc *ReportController) Sales(c *gin.Context) {
	// TODO (HU-Reportes): invocar rc.service.GetSalesReport() y serializar.
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (rc *ReportController) Inventory(c *gin.Context) {
	// TODO (HU-Reportes): invocar rc.service.GetInventoryReport() y serializar.
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}
