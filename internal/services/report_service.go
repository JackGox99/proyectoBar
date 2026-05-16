package services

import (
	"bar-inventory-api/internal/repository"
)

// SalesReportResponse es la respuesta completa del reporte de ventas (HU028).
type SalesReportResponse struct {
	KPIs        repository.ReportKPIs       `json:"kpis"`
	TopProducts []repository.TopProduct     `json:"top_products"`
	Rows        []repository.SalesReportRow `json:"rows"`
}

// ReportService define el contrato de lógica de reportes.
type ReportService interface {
	GetSalesReport(f repository.SalesFilter) (*SalesReportResponse, error)
}

type reportService struct {
	reportRepo repository.ReportRepository
}

// NewReportService inyecta el ReportRepository.
func NewReportService(reportRepo repository.ReportRepository) ReportService {
	return &reportService{reportRepo: reportRepo}
}

// GetSalesReport consolida KPIs, top products y filas de detalle en una sola respuesta.
func (s *reportService) GetSalesReport(f repository.SalesFilter) (*SalesReportResponse, error) {
	kpis, err := s.reportRepo.GetKPIs(f)
	if err != nil {
		return nil, err
	}
	top, err := s.reportRepo.GetTopProducts(f)
	if err != nil {
		return nil, err
	}
	rows, err := s.reportRepo.GetRows(f)
	if err != nil {
		return nil, err
	}
	return &SalesReportResponse{
		KPIs:        kpis,
		TopProducts: top,
		Rows:        rows,
	}, nil
}
