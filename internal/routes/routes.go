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
		users.DELETE("/:id", adminOnly, ctrl.User.Delete)
	}

	// Venues — solo lectura, usado por el selector Location en HU008.
	venues := protected.Group("/venues")
	{
		venues.GET("", ctrl.Venue.List)
	}

	// Categories
	categories := protected.Group("/categories")
	{
		categories.GET("", ctrl.Category.List)
		categories.GET("/:id", ctrl.Category.GetByID)
		categories.POST("", ctrl.Category.Create)
		categories.PUT("/:id", ctrl.Category.Update)
		categories.DELETE("/:id", ctrl.Category.Delete)
	}

	// Products
	products := protected.Group("/products")
	{
		products.GET("", ctrl.Product.List)
		products.GET("/:id", ctrl.Product.GetByID)
		products.POST("", ctrl.Product.Create)
		products.PUT("/:id", ctrl.Product.Update)
		products.DELETE("/:id", ctrl.Product.Delete)
	}

	// Inventory
	inventory := protected.Group("/inventory")
	{
		inventory.GET("", ctrl.Inventory.List)
		inventory.GET("/:id", ctrl.Inventory.GetByID)
		inventory.POST("", ctrl.Inventory.Create)
		inventory.PUT("/:id", ctrl.Inventory.Update)
		inventory.POST("/:id/movements", ctrl.Inventory.AddMovement)
	}

	// Orders
	orders := protected.Group("/orders")
	{
		orders.GET("", ctrl.Order.List)
		orders.GET("/:id", ctrl.Order.GetByID)
		orders.POST("", ctrl.Order.Create)
		orders.PUT("/:id", ctrl.Order.Update)
		orders.POST("/:id/items", ctrl.Order.AddItem)
		orders.POST("/:id/pay", ctrl.Order.Pay)
	}

	// Reports
	reports := protected.Group("/reports")
	{
		reports.GET("/sales", ctrl.Report.Sales)
		reports.GET("/inventory", ctrl.Report.Inventory)
	}
}
