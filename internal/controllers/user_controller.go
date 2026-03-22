package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"bar-inventory-api/internal/services"
)

// UserController maneja las peticiones HTTP de usuarios.
type UserController struct {
	service services.UserService
}

func NewUserController(service services.UserService) *UserController {
	return &UserController{service: service}
}

func (uc *UserController) List(c *gin.Context) {
	// TODO (HU-Usuarios): llamar uc.service.List() y serializar a JSON.
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (uc *UserController) GetByID(c *gin.Context) {
	// TODO (HU-Usuarios): parsear c.Param("id"), llamar uc.service.GetByID.
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (uc *UserController) Create(c *gin.Context) {
	// TODO (HU-Usuarios): bind JSON, validar, llamar uc.service.Create.
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (uc *UserController) Update(c *gin.Context) {
	// TODO (HU-Usuarios): parsear id, bind JSON, llamar uc.service.Update.
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

func (uc *UserController) Delete(c *gin.Context) {
	// TODO (HU-Usuarios): parsear id, llamar uc.service.Delete.
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}
