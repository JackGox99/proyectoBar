// Package middleware contiene middlewares HTTP transversales al sistema:
// autenticación (JWT) y autorización por rol (RBAC).
package middleware

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"

	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/services"
)

// Claves bajo las cuales los claims autenticados se guardan en el contexto Gin.
// Los controllers pueden leerlos con c.MustGet(CtxClaims).(*services.TokenClaims).
const (
	CtxClaims = "auth_claims"
)

// AuthRequired valida el header Authorization: Bearer <jwt>, verifica la firma
// contra JWT_SECRET y carga los claims en el contexto para middlewares/handlers
// posteriores (HU008).
//
// Responde 401 si el header falta, el formato es inválido o el token no valida.
func AuthRequired(authSvc services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		header := c.GetHeader("Authorization")
		if header == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			return
		}

		// Formato esperado: "Bearer <token>".
		parts := strings.SplitN(header, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") || parts[1] == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authorization header format"})
			return
		}

		claims, err := authSvc.ValidateToken(parts[1])
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired token"})
			return
		}

		c.Set(CtxClaims, claims)
		c.Next()
	}
}

// RequireRole restringe una ruta a uno o más roles autorizados (RBAC, HU008).
// Debe usarse DESPUÉS de AuthRequired: depende de los claims cargados en contexto.
// Responde 403 si el usuario autenticado no cumple el rol requerido.
func RequireRole(allowed ...models.RolUsuario) gin.HandlerFunc {
	return func(c *gin.Context) {
		raw, exists := c.Get(CtxClaims)
		if !exists {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authentication required"})
			return
		}
		claims, ok := raw.(*services.TokenClaims)
		if !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid authentication context"})
			return
		}

		for _, role := range allowed {
			if claims.Rol == role {
				c.Next()
				return
			}
		}

		c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "forbidden: insufficient privileges"})
	}
}
