package controllers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/services"
)

// ProductController maneja las peticiones HTTP de productos (HU013).
type ProductController struct {
	service services.ProductService
}

func NewProductController(service services.ProductService) *ProductController {
	return &ProductController{service: service}
}

// productRequest es el DTO de entrada para crear/actualizar un producto.
// PurchaseCost y SalePrice se reciben como enteros (moneda local sin decimales);
// el servicio valida que PurchaseCost > 0 y PurchaseCost < SalePrice.
// VenueIDs solo aplica al Create: indica en qué sedes se habilita el inventario
// con stock 0. En Update se ignora (la asignación de sedes no se modifica aquí).
type productRequest struct {
	Name         string  `json:"name"          binding:"required,min=1,max=150"`
	CategoryID   uint    `json:"category_id"   binding:"required"`
	Description  string  `json:"description"`
	PurchaseCost float64 `json:"purchase_cost" binding:"required"`
	SalePrice    float64 `json:"sale_price"    binding:"required"`
	VenueIDs     []uint  `json:"venue_ids"`
}

// List retorna todos los productos con su categoría.
func (pc *ProductController) List(c *gin.Context) {
	products, err := pc.service.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, products)
}

// GetByID retorna un producto por su ID.
func (pc *ProductController) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	product, err := pc.service.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}
	c.JSON(http.StatusOK, product)
}

// Create registra un nuevo producto validando nombre único y categoría (HU013).
func (pc *ProductController) Create(c *gin.Context) {
	var req productRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product := &models.Product{
		Nombre:      req.Name,
		CategoriaID: req.CategoryID,
		Descripcion: req.Description,
		CostoCompra: req.PurchaseCost,
		Precio:      req.SalePrice,
	}

	if err := pc.service.Create(product, req.VenueIDs); err != nil {
		pc.mapError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Product registered successfully",
		"product": product,
	})
}

// Update actualiza un producto existente.
func (pc *ProductController) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	product, err := pc.service.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		return
	}

	var req productRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product.Nombre = req.Name
	product.CategoriaID = req.CategoryID
	product.Descripcion = req.Description
	product.CostoCompra = req.PurchaseCost
	product.Precio = req.SalePrice

	if err := pc.service.Update(product); err != nil {
		pc.mapError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Product updated successfully",
		"product": product,
	})
}

// UpdatePrice actualiza únicamente el precio de un producto (HU014).
func (pc *ProductController) UpdatePrice(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}

	var req struct {
		Price float64 `json:"price" binding:"required"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := pc.service.UpdatePrice(uint(id), req.Price); err != nil {
		pc.mapError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Price updated successfully"})
}

// Delete realiza la eliminación lógica de un producto (HU016).
// El producto se marca como inactivo para preservar reportes históricos.
func (pc *ProductController) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid id"})
		return
	}
	if err := pc.service.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Product removed from catalog"})
}

// mapError traduce errores tipados del servicio a códigos HTTP.
func (pc *ProductController) mapError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrProductNameRequired),
		errors.Is(err, services.ErrProductNameTaken),
		errors.Is(err, services.ErrCategoryNotFound),
		errors.Is(err, services.ErrInvalidPrice),
		errors.Is(err, services.ErrInvalidPurchaseCost),
		errors.Is(err, services.ErrPurchaseExceedsSale),
		errors.Is(err, services.ErrVenuesRequired),
		errors.Is(err, services.ErrSedeNotFound):
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
}
