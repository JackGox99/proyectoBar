package services

import (
	"errors"

	"bar-inventory-api/config"
	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/repository"

	"golang.org/x/crypto/bcrypt"
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

// Login autentica un usuario verificando su contraseña contra el hash almacenado (HU005).
// Siempre devuelve el mismo mensaje de error para email y password incorrectos,
// evitando filtrar si el email existe o no (seguridad por enumeración).
// TODO (HU-JWT): generar y retornar un JWT firmado con s.cfg.JWTSecret.
func (s *authService) Login(email, password string) (string, error) {
	user, err := s.userRepo.FindByEmail(email)
	if err != nil {
		// Email no encontrado: devolvemos error genérico para no filtrar información.
		return "", errors.New("credenciales inválidas")
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(password)); err != nil {
		// Password incorrecta: mismo mensaje genérico.
		return "", errors.New("credenciales inválidas")
	}

	// TODO (HU-JWT): construir claims con user.ID, user.Email, user.Rol
	// y firmar el token con golang-jwt/jwt usando s.cfg.JWTSecret.
	return "", errors.New("not implemented: JWT pendiente HU de autenticación")
}

// ValidateToken verifica la firma y vigencia de un JWT y extrae sus claims.
// TODO (HU-JWT): implementar con golang-jwt/jwt usando s.cfg.JWTSecret.
func (s *authService) ValidateToken(token string) (*TokenClaims, error) {
	return nil, errors.New("not implemented: JWT pendiente HU de autenticación")
}
