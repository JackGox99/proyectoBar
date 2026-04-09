package services

import (
	"bar-inventory-api/internal/models"
	"bar-inventory-api/internal/repository"
)

// VenueService expone operaciones de lectura sobre las sedes del bar.
// Se usa tanto para poblar el selector "Location" en HU008 como para validar
// que la sede referenciada al crear un usuario exista efectivamente.
type VenueService interface {
	List() ([]models.Venue, error)
	GetByID(id uint) (*models.Venue, error)
}

type venueService struct {
	repo repository.VenueRepository
}

func NewVenueService(repo repository.VenueRepository) VenueService {
	return &venueService{repo: repo}
}

func (s *venueService) List() ([]models.Venue, error) {
	return s.repo.FindAll()
}

func (s *venueService) GetByID(id uint) (*models.Venue, error) {
	return s.repo.FindByID(id)
}
