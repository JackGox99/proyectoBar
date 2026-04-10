package services

import (
	"errors"

	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/repository"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// UserService define el contrato de lógica de negocio para usuarios.
// Actúa como capa de orquestación entre el controller y el repositorio (SRP).
type UserService interface {
	List() ([]models.User, error)
	GetByID(id uint) (*models.User, error)
	// Create recibe el usuario y la contraseña en texto plano.
	// El servicio es responsable de hashearla antes de persistir (HU005).
	// Valida unicidad del username y las reglas de negocio rol/sede (HU008).
	Create(u *models.User, plainPassword string) error
	// Update recibe newPlainPassword vacío si no se quiere cambiar la contraseña.
	Update(u *models.User, newPlainPassword string) error
	Delete(id uint) error
}

type userService struct {
	repo     repository.UserRepository
	venueSvc VenueService
}

func NewUserService(repo repository.UserRepository, venueSvc VenueService) UserService {
	return &userService{repo: repo, venueSvc: venueSvc}
}

func (s *userService) List() ([]models.User, error) {
	return s.repo.FindAll()
}

func (s *userService) GetByID(id uint) (*models.User, error) {
	return s.repo.FindByID(id)
}

// Create persiste el usuario aplicando las reglas de negocio de HU008:
//  1. El username debe ser único.
//  2. Los roles "cajero" y "mesero" requieren una sede válida.
//  3. El rol "admin" no debe tener sede asignada.
//  4. La contraseña en texto plano se hashea con bcrypt cost 12 (HU005).
func (s *userService) Create(u *models.User, plainPassword string) error {
	if plainPassword == "" {
		return ErrPasswordRequired
	}

	if err := validateRoleSede(u.Rol, u.SedeID); err != nil {
		return err
	}

	// Verifica que la sede exista cuando el rol la requiere.
	if u.SedeID != nil {
		if _, err := s.venueSvc.GetByID(*u.SedeID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrSedeNotFound
			}
			return err
		}
	}

	// Unicidad de username.
	if existing, err := s.repo.FindByUsername(u.Username); err == nil && existing != nil {
		return ErrUsernameTaken
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	hash, err := bcrypt.GenerateFromPassword([]byte(plainPassword), 12)
	if err != nil {
		return err
	}
	u.PasswordHash = string(hash)

	return s.repo.Create(u)
}

// Update rehashea la contraseña solo si se proporciona una nueva (no vacía).
// Aplica las reglas de negocio rol/sede (HU008/HU009): los roles cajero/mesero
// requieren sede y admin no puede tenerla; además valida que la sede exista.
func (s *userService) Update(u *models.User, newPlainPassword string) error {
	if err := validateRoleSede(u.Rol, u.SedeID); err != nil {
		return err
	}

	if u.SedeID != nil {
		if _, err := s.venueSvc.GetByID(*u.SedeID); err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrSedeNotFound
			}
			return err
		}
	}

	if newPlainPassword != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(newPlainPassword), 12)
		if err != nil {
			return err
		}
		u.PasswordHash = string(hash)
	}
	return s.repo.Update(u)
}

func (s *userService) Delete(id uint) error {
	return s.repo.Delete(id)
}

// validateRoleSede aplica la regla de negocio de HU008 sobre el binomio rol/sede.
func validateRoleSede(rol models.RolUsuario, sedeID *uint) error {
	switch rol {
	case models.RolAdmin:
		if sedeID != nil {
			return ErrSedeNotAllowed
		}
	case models.RolCajero, models.RolMesero:
		if sedeID == nil {
			return ErrSedeRequired
		}
	default:
		return ErrInvalidRole
	}
	return nil
}
