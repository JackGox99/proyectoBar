package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

// AuthRequired is a placeholder JWT middleware for protected routes.
func AuthRequired() gin.HandlerFunc {
	return func(c *gin.Context) {
		token := c.GetHeader("Authorization")
		if token == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "authorization header required"})
			return
		}
		c.Next()
	}
}
