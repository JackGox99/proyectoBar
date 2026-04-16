package services

import (
	"errors"
	"strings"

	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/repository"

	"gorm.io/gorm"
)

// CategoryService define el contrato de lógica de negocio para categorías.
type CategoryService interface {
	List() ([]models.Category, error)
	GetByID(id uint) (*models.Category, error)
	Create(c *models.Category) error
	Update(c *models.Category) error
	Delete(id uint) error
}

type categoryService struct {
	repo repository.CategoryRepository
}

func NewCategoryService(repo repository.CategoryRepository) CategoryService {
	return &categoryService{repo: repo}
}

func (s *categoryService) List() ([]models.Category, error) {
	return s.repo.FindAll()
}

func (s *categoryService) GetByID(id uint) (*models.Category, error) {
	return s.repo.FindByID(id)
}

// Create valida que el nombre no esté vacío y que no exista otra categoría
// con el mismo nombre (HU012: no duplicate category names).
func (s *categoryService) Create(c *models.Category) error {
	c.Nombre = strings.TrimSpace(c.Nombre)
	if c.Nombre == "" {
		return ErrCategoryNameRequired
	}

	if existing, err := s.repo.FindByName(c.Nombre); err == nil && existing != nil {
		return ErrCategoryNameTaken
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	return s.repo.Create(c)
}

// Update valida nombre no vacío y unicidad (excluyendo la propia categoría).
func (s *categoryService) Update(c *models.Category) error {
	c.Nombre = strings.TrimSpace(c.Nombre)
	if c.Nombre == "" {
		return ErrCategoryNameRequired
	}

	if existing, err := s.repo.FindByName(c.Nombre); err == nil && existing != nil && existing.ID != c.ID {
		return ErrCategoryNameTaken
	} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}

	return s.repo.Update(c)
}

func (s *categoryService) Delete(id uint) error {
	return s.repo.Delete(id)
}
