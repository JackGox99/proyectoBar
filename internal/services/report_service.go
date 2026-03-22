package services

import (
	"bar-inventory-api/internal/repository"
)

// SalesReport será definido en detalle en la HU de Reportes.
// Se declara aquí para que la interfaz compile y los controllers puedan ser creados.
type SalesReport struct{} // TODO (HU-Reportes): añadir campos: total, fecha, desglose por sede.

// InventoryReport será definido en detalle en la HU de Reportes.
type InventoryReport struct{} // TODO (HU-Reportes): añadir campos: stock_bajo, movimientos.

// ReportService define el contrato de lógica de reportes.
type ReportService interface {
	GetSalesReport() (*SalesReport, error)
	GetInventoryReport() (*InventoryReport, error)
}

type reportService struct {
	orderRepo     repository.OrderRepository
	inventoryRepo repository.InventoryRepository
	paymentRepo   repository.PaymentRepository
}

// NewReportService recibe los tres repos que necesitará para agregar datos.
func NewReportService(
	orderRepo repository.OrderRepository,
	inventoryRepo repository.InventoryRepository,
	paymentRepo repository.PaymentRepository,
) ReportService {
	return &reportService{
		orderRepo:     orderRepo,
		inventoryRepo: inventoryRepo,
		paymentRepo:   paymentRepo,
	}
}

// GetSalesReport genera el reporte de ventas.
// TODO (HU-Reportes): agregar pedidos pagados, totales por sede y método de pago.
func (s *reportService) GetSalesReport() (*SalesReport, error) {
	return &SalesReport{}, nil
}

// GetInventoryReport genera el reporte de inventario.
// TODO (HU-Reportes): detectar productos con stock_actual < stock_minimo.
func (s *reportService) GetInventoryReport() (*InventoryReport, error) {
	return &InventoryReport{}, nil
}
