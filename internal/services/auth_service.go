package services

import (
	"errors"

	"bar-inventory-api/config"
	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

// TokenClaims contiene la información extraída de un JWT válido.
type TokenClaims struct {
	UserID uint
	Email  string
	Rol    models.RolUsuario
}

// LoginResponse es la respuesta que recibe el cliente tras autenticarse con éxito.
// Incluye el rol y sede para que el frontend pueda enrutar correctamente (HU006).
// Token es placeholder hasta que se implemente JWT (HU-JWT).
type LoginResponse struct {
	Token  string            `json:"token"`
	Nombre string            `json:"nombre"`
	Rol    models.RolUsuario `json:"rol"`
	SedeID *uint             `json:"sede_id"`
}

// AuthService define el contrato de autenticación y autorización.
type AuthService interface {
	Login(email, password string) (*LoginResponse, error)
	ValidateToken(token string) (*TokenClaims, error)
}

type authService struct {
	userRepo repository.UserRepository
	cfg      *config.Config
}

// NewAuthService construye el servicio inyectando sus dependencias por interfaz (DIP).
func NewAuthService(userRepo repository.UserRepository, cfg *config.Config) AuthService {
	return &authService{userRepo: userRepo, cfg: cfg}
}

// Login autentica un usuario verificando bcrypt (HU005) y retorna rol + sede (HU006).
// Siempre devuelve el mismo error genérico para evitar enumeración de usuarios.
// TODO (HU-JWT): reemplazar token placeholder por JWT firmado con s.cfg.JWTSecret.
func (s *authService) Login(email, password string) (*LoginResponse, error) {
	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		return nil, errors.New("invalid username or password")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		return nil, errors.New("invalid username or password")
	}

	// TODO (HU-JWT): generar JWT firmado con claims: user.ID, user.Email, user.Rol, user.SedeID
	return &LoginResponse{
		Token:  "",
		Nombre: user.Nombre,
		Rol:    user.Rol,
		SedeID: user.SedeID,
	}, nil
}

// ValidateToken verifica la firma y vigencia de un JWT y extrae sus claims.
// TODO (HU-JWT): implementar con golang-jwt/jwt usando s.cfg.JWTSecret.
func (s *authService) ValidateToken(token string) (*TokenClaims, error) {
	return nil, errors.New("not implemented: JWT pendiente HU-JWT")
}
