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

	// El servicio verifica bcrypt internamente (HU005).
	// Cuando HU-JWT esté lista, este token contendrá el JWT firmado.
	token, err := ac.service.Login(req.Email, req.Password)
	if err != nil {
		// "credenciales inválidas" tanto para email inexistente como password incorrecta.
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"token": token})
}

// Logout godoc
// @Summary Cerrar sesión
// @Tags    auth
// @Router  /api/v1/auth/logout [post]
func (ac *AuthController) Logout(c *gin.Context) {
	// TODO (HU-JWT): con JWT stateless el cliente descarta el token.
	// Si se implementa blacklist, invalidar aquí.
	c.JSON(http.StatusOK, gin.H{"message": "sesión cerrada"})
}
