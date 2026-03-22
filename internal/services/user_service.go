package services

import (
	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/repository"
)

// UserService define el contrato de lógica de negocio para usuarios.
// Actúa como capa de orquestación entre el controller y el repositorio (SRP).
type UserService interface {
	List() ([]models.User, error)
	GetByID(id uint) (*models.User, error)
	Create(u *models.User) error
	Update(u *models.User) error
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

// Create delega al repositorio.
// TODO: validar email único, hashear password con bcrypt antes de persistir.
func (s *userService) Create(u *models.User) error {
	return s.repo.Create(u)
}

func (s *userService) Update(u *models.User) error {
	return s.repo.Update(u)
}

func (s *userService) Delete(id uint) error {
	return s.repo.Delete(id)
}
