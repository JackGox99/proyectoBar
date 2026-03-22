package services

import (
	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/repository"
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

func (s *categoryService) Create(c *models.Category) error {
	return s.repo.Create(c)
}

func (s *categoryService) Update(c *models.Category) error {
	return s.repo.Update(c)
}

func (s *categoryService) Delete(id uint) error {
	return s.repo.Delete(id)
}
