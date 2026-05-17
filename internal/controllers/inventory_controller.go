package controllers

import (
	"encoding/json"
	"errors"
	"log"
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

	search := c.Query("search")

	switch claims.Rol {
	case models.RolAdmin:
		venueQ := c.Query("venue_id")
		if search != "" && venueQ != "" {
			// Binary search: requiere venue_id para acotar la sede.
			venueID, parseErr := strconv.ParseUint(venueQ, 10, 64)
			if parseErr != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid venue_id"})
				return
			}
			item, searchErr := ic.service.SearchByProductName(uint(venueID), search)
			if searchErr != nil {
				c.JSON(http.StatusOK, []models.Inventory{})
				return
			}
			c.JSON(http.StatusOK, []models.Inventory{*item})
			return
		}
		if venueQ != "" {
			venueID, parseErr := strconv.ParseUint(venueQ, 10, 64)
			if parseErr != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid venue_id"})
				return
			}
			items, err = ic.service.ListByVenue(uint(venueID))
		} else {
			items, err = ic.service.List()
		}
	case models.RolCajero, models.RolMesero:
		if claims.SedeID == nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "user has no assigned location"})
			return
		}
		if search != "" {
			// Binary search: ordena inventario de la sede y busca por nombre exacto.
			item, searchErr := ic.service.SearchByProductName(*claims.SedeID, search)
			if searchErr != nil {
				c.JSON(http.StatusOK, []models.Inventory{})
				return
			}
			c.JSON(http.StatusOK, []models.Inventory{*item})
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

// ListMovements retorna el historial de entradas manuales (HU020) aplicando RBAC:
// - Cajero: solo movimientos de su sede asignada (SedeID del JWT). Cualquier
//   ?venue_id= se ignora; si no tiene sede, 403.
// - Admin:  por defecto ve todas las sedes; puede filtrar con ?venue_id=.
// - Otros roles: 403.
//
// Filtro opcional ?product= aplica búsqueda parcial sobre el nombre del producto.
// Resultados ordenados cronológicamente DESC (más reciente primero).
func (ic *InventoryController) ListMovements(c *gin.Context) {
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

	productSearch := c.Query("product")

	var venueID *uint
	switch claims.Rol {
	case models.RolAdmin:
		if q := c.Query("venue_id"); q != "" {
			id, err := strconv.ParseUint(q, 10, 64)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{"error": "invalid venue_id"})
				return
			}
			v := uint(id)
			venueID = &v
		}
		// Sin venue_id: venueID == nil → todas las sedes.
	case models.RolCajero:
		if claims.SedeID == nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "cashier has no assigned location"})
			return
		}
		// Forzar la sede del JWT, ignorando cualquier venue_id del query.
		venueID = claims.SedeID
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: insufficient privileges"})
		return
	}

	movements, err := ic.service.ListEntryMovements(venueID, productSearch)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, movements)
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

// addStockRequest es el DTO de entrada para POST /inventory/add (HU018).
// Quantity se declara como json.Number para rechazar decimales (ej: 1.5) antes de convertir a int.
type addStockRequest struct {
	ProductID uint        `json:"product_id" binding:"required"`
	Quantity  json.Number `json:"quantity"   binding:"required"`
	VenueID   uint        `json:"venue_id"` // opcional: solo admin; cajero usa JWT.SedeID
}

// AddStock registra una entrada manual de stock (HU018).
// - Cajero: la sede se toma de JWT.SedeID; se ignora cualquier venue_id del body.
// - Admin: debe enviar venue_id en el body.
// - Solo admite cantidades enteras positivas.
func (ic *InventoryController) AddStock(c *gin.Context) {
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

	var req addStockRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// HU019 — Integer Unit Validation: json.Number.Int64() falla si el texto
	// contiene punto decimal o exponente (ej. "1.5", "1.0", "1e2").
	// El log replica el formato del mockup HU019.
	qty64, err := req.Quantity.Int64()
	if err != nil {
		log.Printf("HU019: Validation failed. Expected Integer, received Float. (raw=%q)", req.Quantity.String())
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid input. Please enter a whole number (e.g., 10)."})
		return
	}
	if qty64 <= 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Quantity must be greater than zero."})
		return
	}

	// Resolver la sede según el rol.
	var venueID uint
	switch claims.Rol {
	case models.RolCajero:
		if claims.SedeID == nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "cashier has no assigned location"})
			return
		}
		venueID = *claims.SedeID // se ignora req.VenueID para preservar independencia operativa
	case models.RolAdmin:
		if req.VenueID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "venue_id is required for admin"})
			return
		}
		venueID = req.VenueID
	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "forbidden: insufficient privileges"})
		return
	}

	inv, err := ic.service.AddStock(venueID, req.ProductID, int(qty64), claims.UserID)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrInvalidQuantity):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrProductNotFound):
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrVenueRequired):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message":   "Stock updated successfully",
		"inventory": inv,
	})
}
