package services

import (
	"errors"

	"bar-inventory-api/config"
	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/repository"
)

// TokenClaims contiene la información extraída de un JWT válido.
// Se define aquí para que el middleware pueda depender de la interfaz AuthService
// sin importar directamente la implementación concreta.
type TokenClaims struct {
	UserID uint
	Email  string
	Rol    models.RolUsuario
}

// AuthService define el contrato de autenticación y autorización.
type AuthService interface {
	Login(email, password string) (string, error)
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

// Login autentica un usuario y devuelve un JWT firmado.
// TODO (HU-Auth): verificar password hash con bcrypt y generar JWT con golang-jwt/jwt.
func (s *authService) Login(email, password string) (string, error) {
	return "", errors.New("not implemented: pendiente HU de autenticación")
}

// ValidateToken verifica la firma y vigencia de un JWT y extrae sus claims.
// TODO (HU-Auth): implementar con golang-jwt/jwt usando s.cfg.JWTSecret.
func (s *authService) ValidateToken(token string) (*TokenClaims, error) {
	return nil, errors.New("not implemented: pendiente HU de autenticación")
}
