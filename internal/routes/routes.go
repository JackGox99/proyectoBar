// Package routes define los endpoints HTTP y los agrupa en recursos REST.
// Solo conoce qué URLs existen y a qué controller method apuntan.
// No sabe cómo se construyen los controllers ni cómo se conecta la BD (SRP).
package routes

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"bar-inventory-api/internal/controllers"
	"bar-inventory-api/internal/middleware"
	"bar-inventory-api/internal/models"
)

// Controllers agrupa todos los controllers del sistema.
// routes.Register recibe este bundle en lugar de *gorm.DB,
// garantizando que la capa de rutas no tenga dependencia directa con la BD (DIP).
type Controllers struct {
	Auth      *controllers.AuthController
	User      *controllers.UserController
	Profile   *controllers.ProfileController
	Venue     *controllers.VenueController
	Category  *controllers.CategoryController
	Product   *controllers.ProductController
	Inventory *controllers.InventoryController
	Order     *controllers.OrderController
	Report    *controllers.ReportController
}

// Register registra todas las rutas en el router.
// authMiddleware se recibe como parámetro para no acoplar routes al paquete middleware (DIP).
func Register(r *gin.Engine, ctrl Controllers, authMiddleware gin.HandlerFunc) {
	// ── Health Check ──────────────────────────────────────────────────────────
	// HU003: el servidor debe responder 200 OK a una petición de prueba.
	r.GET("/health", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"status":  "ok",
			"message": "Server is running",
		})
	})

	api := r.Group("/api/v1")

	// ── Auth (rutas públicas — sin middleware JWT) ─────────────────────────────
	auth := api.Group("/auth")
	{
		auth.POST("/login", ctrl.Auth.Login)
		auth.POST("/logout", ctrl.Auth.Logout)
	}

	// ── Rutas protegidas (requieren JWT) ──────────────────────────────────────
	protected := api.Group("", authMiddleware)

	// Profile — HU010: cambio de contraseña del usuario autenticado.
	// Cualquier usuario autenticado puede cambiar su propia contraseña.
	profile := protected.Group("/profile")
	{
		profile.PUT("/password", ctrl.Profile.ChangePassword)
	}

	// Users — HU008: POST/PUT/DELETE restringidos a rol admin (RBAC).
	// List/GetByID quedan abiertas a cualquier usuario autenticado (útil en
	// dashboards futuros); ajústese con RequireRole si se endurece la política.
	adminOnly := middleware.RequireRole(models.RolAdmin)
	users := protected.Group("/users")
	{
		users.GET("", ctrl.User.List)
		users.GET("/:id", ctrl.User.GetByID)
		users.POST("", adminOnly, ctrl.User.Create)
		users.PUT("/:id", adminOnly, ctrl.User.Update)
		users.PATCH("/:id/deactivate", adminOnly, ctrl.User.Deactivate) // HU011
		users.DELETE("/:id", adminOnly, ctrl.User.Delete)
	}

	// Venues — solo lectura, usado por el selector Location en HU008.
	venues := protected.Group("/venues")
	{
		venues.GET("", ctrl.Venue.List)
	}

	// Categories — HU012: solo admin puede crear, editar y eliminar.
	categories := protected.Group("/categories")
	{
		categories.GET("", ctrl.Category.List)
		categories.GET("/:id", ctrl.Category.GetByID)
		categories.POST("", adminOnly, ctrl.Category.Create)
		categories.PUT("/:id", adminOnly, ctrl.Category.Update)
		categories.DELETE("/:id", adminOnly, ctrl.Category.Delete)
	}

	// Products — HU013: solo admin puede crear, editar y eliminar.
	products := protected.Group("/products")
	{
		products.GET("", ctrl.Product.List)
		products.GET("/:id", ctrl.Product.GetByID)
		products.POST("", adminOnly, ctrl.Product.Create)
		products.PUT("/:id", adminOnly, ctrl.Product.Update)
		products.PATCH("/:id/price", adminOnly, ctrl.Product.UpdatePrice) // HU014
		products.DELETE("/:id", adminOnly, ctrl.Product.Delete)
	}

	// Inventory — HU017: admin ve inventario global, cajero ve solo su sede.
	// HU018: entrada manual de stock restringida a admin y cajero.
	adminOrCashier        := middleware.RequireRole(models.RolAdmin, models.RolCajero)
	adminCashierOrWaiter  := middleware.RequireRole(models.RolAdmin, models.RolCajero, models.RolMesero)
	inventory := protected.Group("/inventory")
	{
		// HU023: mesero también necesita leer stock de su sede para verificar disponibilidad.
		inventory.GET("", adminCashierOrWaiter, ctrl.Inventory.List)
		// /movements antes que /:id para evitar ambigüedad con la ruta dinámica.
		inventory.GET("/movements", adminOrCashier, ctrl.Inventory.ListMovements) // HU020
		inventory.GET("/:id", ctrl.Inventory.GetByID)
		inventory.POST("", ctrl.Inventory.Create)
		inventory.POST("/add", adminOrCashier, ctrl.Inventory.AddStock) // HU018
		inventory.PUT("/:id", ctrl.Inventory.Update)
		inventory.POST("/:id/movements", ctrl.Inventory.AddMovement)
	}

	// Orders — HU021: mesero y admin pueden abrir y cancelar pedidos.
	adminOrWaiter := middleware.RequireRole(models.RolAdmin, models.RolMesero)
	orders := protected.Group("/orders")
	{
		orders.GET("", ctrl.Order.List)
		orders.GET("/:id", ctrl.Order.GetByID)
		orders.POST("", adminOrWaiter, ctrl.Order.Create)       // HU021
		orders.PUT("/:id", ctrl.Order.Update)
		orders.DELETE("/:id", adminOrWaiter, ctrl.Order.Cancel) // HU021
		orders.POST("/:id/items", adminOrWaiter, ctrl.Order.AddItem)           // HU023
		orders.DELETE("/:id/items/:itemId", adminOrWaiter, ctrl.Order.RemoveItem) // HU024
		orders.POST("/:id/pay", adminOrCashier, ctrl.Order.Pay)          // HU025
		orders.POST("/:id/finalize", adminOrCashier, ctrl.Order.Finalize) // HU026
	}

	// Reports
	reports := protected.Group("/reports")
	{
		reports.GET("/sales", ctrl.Report.Sales)
		reports.GET("/inventory", ctrl.Report.Inventory)
	}
}
