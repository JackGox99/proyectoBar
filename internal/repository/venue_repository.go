package repository

import (
	"gorm.io/gorm"

	"bar-inventory-api/internal/models"
)

// VenueRepository define el acceso a datos de sedes.
// Solo lectura: las sedes son un conjunto fijo sembrado al iniciar (HU008).
type VenueRepository interface {
	FindAll() ([]models.Venue, error)
	FindByID(id uint) (*models.Venue, error)
}

type venueRepository struct {
	db *gorm.DB
}

func NewVenueRepository(db *gorm.DB) VenueRepository {
	return &venueRepository{db: db}
}

func (r *venueRepository) FindAll() ([]models.Venue, error) {
	var venues []models.Venue
	return venues, r.db.Where("activa = ?", true).Order("nombre ASC").Find(&venues).Error
}

func (r *venueRepository) FindByID(id uint) (*models.Venue, error) {
	var venue models.Venue
	return &venue, r.db.First(&venue, id).Error
}
