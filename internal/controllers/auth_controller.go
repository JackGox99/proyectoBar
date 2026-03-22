package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"bar-inventory-api/internal/services"
)

// AuthController maneja las peticiones HTTP de autenticación.
// Depende de la interfaz AuthService, no de la implementación concreta (DIP).
type AuthController struct {
	service services.AuthService
}

func NewAuthController(service services.AuthService) *AuthController {
	return &AuthController{service: service}
}

// Login godoc
// @Summary Iniciar sesión
// @Tags    auth
// @Accept  json
// @Produce json
// @Router  /api/v1/auth/login [post]
func (ac *AuthController) Login(c *gin.Context) {
	// TODO (HU-Auth): bind JSON body, llamar ac.service.Login, devolver JWT.
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}

// Logout godoc
// @Summary Cerrar sesión
// @Tags    auth
// @Router  /api/v1/auth/logout [post]
func (ac *AuthController) Logout(c *gin.Context) {
	// TODO (HU-Auth): invalidar token (blacklist o cliente descarta).
	c.JSON(http.StatusNotImplemented, gin.H{"message": "not implemented"})
}
