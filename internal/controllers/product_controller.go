package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"bar-inventory-api/internal/services"
)

// ProductController maneja las peticiones HTTP de productos.
type ProductController struct {
	service services.ProductService
}

func NewProductController(service services.ProductService) *ProductController {
	return &ProductController{service: service}
}

func (pc *ProductController) List(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (pc *ProductController) GetByID(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (pc *ProductController) Create(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (pc *ProductController) Update(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (pc *ProductController) Delete(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}
