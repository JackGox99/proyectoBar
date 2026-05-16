package controllers

import (
	"encoding/csv"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"

	"bar-inventory-api/internal/repository"
	"bar-inventory-api/internal/services"
)

// ReportController maneja las peticiones HTTP de reportes (HU028).
type ReportController struct {
	service services.ReportService
}

func NewReportController(service services.ReportService) *ReportController {
	return &ReportController{service: service}
}

// Sales retorna el reporte de ventas consolidado en JSON.
// Query params: venue_id (uint, opcional), from (YYYY-MM-DD), to (YYYY-MM-DD).
func (rc *ReportController) Sales(c *gin.Context) {
	f := parseReportFilter(c)
	report, err := rc.service.GetSalesReport(f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, report)
}

// SalesCSV retorna el detalle del reporte como archivo CSV descargable.
func (rc *ReportController) SalesCSV(c *gin.Context) {
	f := parseReportFilter(c)
	report, err := rc.service.GetSalesReport(f)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", `attachment; filename="sales_report.csv"`)

	w := csv.NewWriter(c.Writer)
	_ = w.Write([]string{
		"Fecha", "Orden", "Cód. Producto", "Producto",
		"Cantidad Vendida", "Precio Venta", "Costo Compra", "Ganancia",
		"Sede", "Método Pago",
	})
	for _, row := range report.Rows {
		_ = w.Write([]string{
			row.Fecha.Format("2006-01-02 15:04"),
			strconv.Itoa(int(row.OrderID)),
			strconv.Itoa(int(row.ProductoID)),
			row.Producto,
			strconv.Itoa(row.CantidadVendida),
			strconv.FormatFloat(row.PrecioVenta, 'f', 2, 64),
			strconv.FormatFloat(row.CostoCompra, 'f', 2, 64),
			strconv.FormatFloat(row.Ganancia, 'f', 2, 64),
			row.Sede,
			paymentMethodLabel(row.MetodoPago),
		})
	}
	w.Flush()
}

// parseReportFilter extrae los query params opcionales de filtro.
func parseReportFilter(c *gin.Context) repository.SalesFilter {
	var f repository.SalesFilter
	if vid := c.Query("venue_id"); vid != "" {
		if id, err := strconv.ParseUint(vid, 10, 64); err == nil {
			uid := uint(id)
			f.VenueID = &uid
		}
	}
	if from := c.Query("from"); from != "" {
		if t, err := time.Parse("2006-01-02", from); err == nil {
			f.From = &t
		}
	}
	if to := c.Query("to"); to != "" {
		if t, err := time.Parse("2006-01-02", to); err == nil {
			// Incluir el día completo hasta las 23:59:59.
			end := t.Add(24*time.Hour - time.Second)
			f.To = &end
		}
	}
	return f
}

func paymentMethodLabel(m string) string {
	switch m {
	case "efectivo":
		return "Cash"
	case "tarjeta_debito":
		return "Debit Card"
	case "tarjeta_credito":
		return "Credit Card"
	}
	return m
}
