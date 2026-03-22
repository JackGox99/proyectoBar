package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"bar-inventory-api/internal/services"
)

// CategoryController maneja las peticiones HTTP de categorías.
type CategoryController struct {
	service services.CategoryService
}

func NewCategoryController(service services.CategoryService) *CategoryController {
	return &CategoryController{service: service}
}

func (cc *CategoryController) List(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (cc *CategoryController) GetByID(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (cc *CategoryController) Create(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (cc *CategoryController) Update(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (cc *CategoryController) Delete(c *gin.Context) {
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}
