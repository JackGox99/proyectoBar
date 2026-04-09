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

// loginRequest acepta `username` como identificador primario (HU008).
// Mantiene `email` opcional para compatibilidad con clientes antiguos: si se
// envía email y no username, se usa como username (el valor que identificaba
// al usuario antes de HU008 era precisamente el email completo).
type loginRequest struct {
	Username string `json:"username"`
	Email    string `json:"email"`
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

	identifier := req.Username
	if identifier == "" {
		identifier = req.Email
	}
	if identifier == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "username is required"})
		return
	}

	// Verifica bcrypt (HU005), emite JWT firmado (HU008) y retorna rol + sede (HU006).
	resp, err := ac.service.Login(identifier, req.Password)
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
