package controllers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"

	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/services"
)

// UserController maneja las peticiones HTTP de usuarios.
type UserController struct {
	service services.UserService
}

func NewUserController(service services.UserService) *UserController {
	return &UserController{service: service}
}

// createUserRequest es el DTO de entrada para crear un usuario.
type createUserRequest struct {
	Nombre string            `json:"nombre"  binding:"required"`
	SedeID *uint             `json:"sede_id"`
	Rol    models.RolUsuario `json:"rol"     binding:"required"`
	Activo bool              `json:"activo"`
}

// updateUserRequest permite actualizar datos del usuario.
// Password es opcional: si está vacío, no se cambia la contraseña.
type updateUserRequest struct {
	Nombre   string            `json:"nombre"`
	Rol      models.RolUsuario `json:"rol"`
	Activo   *bool             `json:"activo"`
	Password string            `json:"password"` // mínimo 8 si se envía
	SedeID   *uint             `json:"sede_id"`
}

func (uc *UserController) List(c *gin.Context) {
	users, err := uc.service.List()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, users)
}

func (uc *UserController) GetByID(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	user, err := uc.service.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "usuario no encontrado"})
		return
	}
	c.JSON(http.StatusOK, user)
}

// Create recibe la contraseña en texto plano y delega el hashing al servicio (HU005).
func (uc *UserController) Create(c *gin.Context) {
	var req createUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user := &models.User{
		Nombre: req.Nombre,
		Rol:    req.Rol,
		SedeID: req.SedeID,
		Activo: req.Activo,
	}

	if err := uc.service.Create(user, ""); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusCreated, user)
}

func (uc *UserController) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}

	user, err := uc.service.GetByID(uint(id))
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "usuario no encontrado"})
		return
	}

	var req updateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if req.Nombre != "" {
		user.Nombre = req.Nombre
	}
	if req.Rol != "" {
		user.Rol = req.Rol
	}
	if req.Activo != nil {
		user.Activo = *req.Activo
	}
	if req.SedeID != nil {
		user.SedeID = req.SedeID
	}

	// Password vacío → el servicio no cambia el hash existente.
	if err := uc.service.Update(user, req.Password); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, user)
}

func (uc *UserController) Delete(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "id inválido"})
		return
	}
	if err := uc.service.Delete(uint(id)); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}
	c.JSON(http.StatusNoContent, nil)
}
