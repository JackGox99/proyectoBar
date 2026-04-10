package controllers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"

	"bar-inventory-api/internal/middleware"
	"bar-inventory-api/internal/services"
)

// ProfileController maneja las peticiones HTTP del perfil del usuario autenticado.
type ProfileController struct {
	service services.UserService
}

func NewProfileController(service services.UserService) *ProfileController {
	return &ProfileController{service: service}
}

// changePasswordRequest es el DTO de entrada para HU010 (Change Password).
type changePasswordRequest struct {
	NewPassword     string `json:"new_password"     binding:"required"`
	ConfirmPassword string `json:"confirm_password"  binding:"required"`
}

// ChangePassword implementa HU010 — User Profile Password Change.
// Extrae el userID del JWT (garantiza que solo pueda cambiar su propia contraseña)
// y delega la validación y persistencia al UserService.
func (pc *ProfileController) ChangePassword(c *gin.Context) {
	// Obtiene los claims del JWT cargados por el middleware AuthRequired.
	raw, _ := c.Get(middleware.CtxClaims)
	claims := raw.(*services.TokenClaims)

	var req changePasswordRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := pc.service.ChangePassword(claims.UserID, req.NewPassword, req.ConfirmPassword); err != nil {
		switch {
		case errors.Is(err, services.ErrPasswordMismatch):
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		case errors.Is(err, services.ErrPasswordTooShort):
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Password updated successfully"})
}
