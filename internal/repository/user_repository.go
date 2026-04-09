package repository

import (
	"gorm.io/gorm"

	"bar-inventory-api/internal/models"
)

// UserRepository define el contrato de acceso a datos para usuarios.
// Los servicios dependen de esta interfaz, no de la implementación concreta (DIP).
type UserRepository interface {
	FindAll() ([]models.User, error)
	FindByID(id uint) (*models.User, error)
	FindByUsername(username string) (*models.User, error)
	FindByEmail(email string) (*models.User, error)
	Create(u *models.User) error
	Update(u *models.User) error
	Delete(id uint) error
}

type userRepository struct {
	db *gorm.DB
}

// NewUserRepository devuelve la interfaz, no la implementación concreta (DIP).
func NewUserRepository(db *gorm.DB) UserRepository {
	return &userRepository{db: db}
}

func (r *userRepository) FindAll() ([]models.User, error) {
	var users []models.User
	return users, r.db.Preload("Sede").Find(&users).Error
}

func (r *userRepository) FindByID(id uint) (*models.User, error) {
	var user models.User
	return &user, r.db.Preload("Sede").First(&user, id).Error
}

func (r *userRepository) FindByUsername(username string) (*models.User, error) {
	var user models.User
	return &user, r.db.Preload("Sede").Where("username = ?", username).First(&user).Error
}

func (r *userRepository) FindByEmail(email string) (*models.User, error) {
	var user models.User
	return &user, r.db.Preload("Sede").Where("email = ?", email).First(&user).Error
}

func (r *userRepository) Create(u *models.User) error {
	return r.db.Create(u).Error
}

func (r *userRepository) Update(u *models.User) error {
	return r.db.Save(u).Error
}

func (r *userRepository) Delete(id uint) error {
	return r.db.Delete(&models.User{}, id).Error
}
