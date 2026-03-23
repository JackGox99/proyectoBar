package services

import (
	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/repository"

	"golang.org/x/crypto/bcrypt"
)

// UserService define el contrato de lógica de negocio para usuarios.
// Actúa como capa de orquestación entre el controller y el repositorio (SRP).
type UserService interface {
	List() ([]models.User, error)
	GetByID(id uint) (*models.User, error)
	// Create recibe el usuario y la contraseña en texto plano.
	// El servicio es responsable de hashearla antes de persistir (HU005).
	Create(u *models.User, plainPassword string) error
	// Update recibe newPlainPassword vacío si no se quiere cambiar la contraseña.
	Update(u *models.User, newPlainPassword string) error
	Delete(id uint) error
}

type userService struct {
	repo repository.UserRepository
}

func NewUserService(repo repository.UserRepository) UserService {
	return &userService{repo: repo}
}

func (s *userService) List() ([]models.User, error) {
	return s.repo.FindAll()
}

func (s *userService) GetByID(id uint) (*models.User, error) {
	return s.repo.FindByID(id)
}

// Create persiste el usuario. Si se proporciona plainPassword, lo hashea con bcrypt
// antes de guardar (HU005). Si viene vacío, el PasswordHash queda vacío hasta que
// se establezca mediante Update.
func (s *userService) Create(u *models.User, plainPassword string) error {
	if plainPassword != "" {
		hash, err := bcrypt.GenerateFromPassword([]byte(plainPassword), 12)
		if err != nil {
			return err
		}
		u.PasswordHash = string(hash)
	}
	return s.repo.Create(u)
}

// Update rehashea la contraseña solo si se proporciona una nueva (no vacía).
func (s *userService) Update(u *models.User, newPlainPassword string) error {
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
