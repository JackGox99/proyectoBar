// Package server encapsula el ciclo de vida del servidor HTTP y el grafo de dependencias.
// Es el único punto donde se instancian repositorios, servicios y controllers (Composition Root).
// Ninguna otra capa conoce cómo se construyen sus dependencias — solo reciben interfaces.
package server

import (
	"log"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"bar-inventory-api/config"
	"bar-inventory-api/internal/controllers"
	"bar-inventory-api/internal/middleware"
	"bar-inventory-api/internal/repository"
	"bar-inventory-api/internal/routes"
	"bar-inventory-api/internal/services"
)

// Server agrupa el router, la configuración y la conexión a BD.
// Expone únicamente Run() — nada más necesita ser público.
type Server struct {
	cfg    *config.Config
	db     *gorm.DB
	router *gin.Engine
}

// New construye el servidor, configura middlewares y registra rutas.
// Es el Composition Root: único lugar donde se ensambla el grafo de dependencias.
func New(cfg *config.Config, db *gorm.DB) *Server {
	s := &Server{
		cfg:    cfg,
		db:     db,
		router: gin.New(), // gin.New en lugar de gin.Default: control explícito sobre middlewares.
	}
	s.setupMiddleware()
	s.setupRoutes()
	return s
}

// Run arranca el servidor HTTP en el puerto configurado.
func (s *Server) Run() error {
	log.Printf("Server running on port %s...", s.cfg.Port)
	return s.router.Run(":" + s.cfg.Port)
}

// setupMiddleware registra los middlewares globales de forma explícita (OCP: abierto a extensión).
func (s *Server) setupMiddleware() {
	s.router.Use(gin.Logger())
	s.router.Use(gin.Recovery())
}

// setupRoutes construye el grafo de dependencias (repos → services → controllers)
// y lo entrega a routes.Register. Ninguna capa inferior conoce este proceso.
func (s *Server) setupRoutes() {
	// ── Capa de Repositorios ──────────────────────────────────────────────────
	userRepo      := repository.NewUserRepository(s.db)
	venueRepo     := repository.NewVenueRepository(s.db)
	categoryRepo  := repository.NewCategoryRepository(s.db)
	productRepo   := repository.NewProductRepository(s.db)
	inventoryRepo := repository.NewInventoryRepository(s.db)
	orderRepo     := repository.NewOrderRepository(s.db)
	paymentRepo   := repository.NewPaymentRepository(s.db)

	// ── Capa de Servicios ─────────────────────────────────────────────────────
	authSvc      := services.NewAuthService(userRepo, s.cfg)
	venueSvc     := services.NewVenueService(venueRepo)
	userSvc      := services.NewUserService(userRepo, venueSvc)
	categorySvc  := services.NewCategoryService(categoryRepo)
	productSvc   := services.NewProductService(productRepo, categoryRepo)
	inventorySvc := services.NewInventoryService(inventoryRepo)
	orderSvc     := services.NewOrderService(orderRepo, paymentRepo)
	reportSvc    := services.NewReportService(orderRepo, inventoryRepo, paymentRepo)

	// ── Capa de Controllers ───────────────────────────────────────────────────
	ctrl := routes.Controllers{
		Auth:      controllers.NewAuthController(authSvc),
		User:      controllers.NewUserController(userSvc),
		Venue:     controllers.NewVenueController(venueSvc),
		Category:  controllers.NewCategoryController(categorySvc),
		Product:   controllers.NewProductController(productSvc),
		Inventory: controllers.NewInventoryController(inventorySvc),
		Order:     controllers.NewOrderController(orderSvc),
		Report:    controllers.NewReportController(reportSvc),
	}

	// ── Registro de Rutas ─────────────────────────────────────────────────────
	// El middleware AuthRequired valida el JWT y carga los claims en el contexto
	// para que RequireRole (aplicado en routes.go) pueda autorizar por rol (HU008).
	routes.Register(s.router, ctrl, middleware.AuthRequired(authSvc))
}
