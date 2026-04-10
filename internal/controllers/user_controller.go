package controllers

import (
	"errors"
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

// createUserRequest es el DTO de entrada para HU008 (Create New Staff Member).
// Nota: los nombres JSON están en inglés porque el frontend del formulario
// está íntegramente en inglés según el criterio de aceptación de HU008.
type createUserRequest struct {
	Username string `json:"username"  binding:"required,min=3,max=50"`
	FullName string `json:"full_name" binding:"required,min=2,max=150"`
	Password string `json:"password"  binding:"required,min=6"`
	Role     string `json:"role"      binding:"required"`
	SedeID   *uint  `json:"sede_id"`
}

// updateUserRequest permite actualizar datos del usuario.
// Password es opcional: si está vacío, no se cambia la contraseña.
//
// HU009: para soportar "Role and Location Assignment" el cliente puede enviar
// `role` (en inglés, como en HU008) y/o `sede_id`. Cuando el nuevo rol es
// admin, el backend fuerza `sede_id = nil`; cuando es cajero/mesero, exige
// que haya una sede válida.
type updateUserRequest struct {
	Nombre   string            `json:"nombre"`
	Rol      models.RolUsuario `json:"rol"`
	Role     string            `json:"role"` // alias en inglés (HU009)
	Activo   *bool             `json:"activo"`
	Password string            `json:"password"` // mínimo 8 si se envía
	SedeID   *uint             `json:"sede_id"`
}

// roleFromRequest traduce los valores en inglés del mockup a los valores ENUM
// que maneja el modelo. Devuelve un string vacío si el rol no es reconocido.
func roleFromRequest(role string) models.RolUsuario {
	switch role {
	case "admin", "Administrator", "administrator":
		return models.RolAdmin
	case "cajero", "Cashier", "cashier":
		return models.RolCajero
	case "mesero", "Waiter", "waiter":
		return models.RolMesero
	default:
		return ""
	}
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

// Create implementa HU008 — Register New User.
// Acceso restringido a admin (aplicado vía middleware RequireRole en routes.go).
// Delega las reglas de negocio al UserService y mapea errores tipados a códigos HTTP.
func (uc *UserController) Create(c *gin.Context) {
	var req createUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	rol := roleFromRequest(req.Role)
	if rol == "" {
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": services.ErrInvalidRole.Error()})
		return
	}

	user := &models.User{
		Username: req.Username,
		Nombre:   req.FullName,
		Rol:      rol,
		SedeID:   req.SedeID,
		Activo:   true,
	}

	if err := uc.service.Create(user, req.Password); err != nil {
		uc.mapCreateError(c, err)
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User created successfully",
		"user":    user,
	})
}

// mapCreateError traduce errores tipados del servicio a códigos HTTP específicos.
func (uc *UserController) mapCreateError(c *gin.Context, err error) {
	switch {
	case errors.Is(err, services.ErrUsernameTaken):
		c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrSedeRequired),
		errors.Is(err, services.ErrSedeNotAllowed),
		errors.Is(err, services.ErrSedeNotFound),
		errors.Is(err, services.ErrInvalidRole),
		errors.Is(err, services.ErrPasswordRequired):
		c.JSON(http.StatusUnprocessableEntity, gin.H{"error": err.Error()})
	default:
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
	}
}

// Update implementa HU009 — Role and Location Assignment.
// Acceso restringido a admin (aplicado vía middleware RequireRole en routes.go).
// Permite modificar rol/sede (y opcionalmente nombre/password/activo) de un
// usuario existente, aplicando las reglas de negocio de rol/sede.
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
	if req.Activo != nil {
		user.Activo = *req.Activo
	}

	// Normaliza el rol: acepta tanto el alias en inglés del mockup ("Waiter",
	// "Cashier", "Admin") como el valor enum ("mesero", "cajero", "admin").
	newRol := user.Rol
	if req.Role != "" {
		parsed := roleFromRequest(req.Role)
		if parsed == "" {
			c.JSON(http.StatusUnprocessableEntity, gin.H{"error": services.ErrInvalidRole.Error()})
			return
		}
		newRol = parsed
	} else if req.Rol != "" {
		newRol = req.Rol
	}
	user.Rol = newRol

	// Ajusta la sede según el nuevo rol:
	//  - admin:   acceso global, se fuerza sede_id = nil.
	//  - otros:   se usa la sede enviada; si no se envió, conserva la actual,
	//             y la validación posterior fallará si queda nil.
	if newRol == models.RolAdmin {
		user.SedeID = nil
		user.Sede = nil
	} else if req.SedeID != nil {
		user.SedeID = req.SedeID
		user.Sede = nil // dejar que el frontend recargue tras la respuesta
	}

	// Password vacío → el servicio no cambia el hash existente.
	if err := uc.service.Update(user, req.Password); err != nil {
		uc.mapCreateError(c, err)
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message": "User permissions updated successfully",
		"user":    user,
	})
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
