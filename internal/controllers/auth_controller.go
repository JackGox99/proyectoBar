package controllers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"bar-inventory-api/internal/services"
)

// AuthController maneja las peticiones HTTP de autenticación.
type AuthController struct {
	service services.AuthService
}

func NewAuthController(service services.AuthService) *AuthController {
	return &AuthController{service: service}
}

type loginRequest struct {
	Email    string `json:"email"    binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// Login godoc
// @Summary Iniciar sesión
// @Tags    auth
// @Accept  json
// @Produce json
// @Router  /api/v1/auth/login [post]
func (ac *AuthController) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Verifica bcrypt (HU005) y retorna rol + sede (HU006).
	resp, err := ac.service.Login(req.Email, req.Password)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, resp)
}

// Logout godoc
// @Summary Cerrar sesión
// @Tags    auth
// @Router  /api/v1/auth/logout [post]
func (ac *AuthController) Logout(c *gin.Context) {
	// Con JWT stateless el cliente descarta el token localmente.
	// TODO (HU-JWT): si se implementa blacklist, invalidar aquí.
	c.JSON(http.StatusOK, gin.H{"message": "logged out"})
}
