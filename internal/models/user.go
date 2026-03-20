package models

import "time"

type User struct {
	ID           uint       `gorm:"primaryKey"                                             json:"id"`
	SedeID       *uint      `                                                              json:"sede_id"`
	Sede         *Venue     `gorm:"foreignKey:SedeID"                                      json:"sede,omitempty"`
	Nombre       string     `gorm:"size:150;not null"                                      json:"nombre"`
	Email        string     `gorm:"size:150;uniqueIndex;not null"                          json:"email"`
	PasswordHash string     `gorm:"size:255;not null"                                      json:"-"`
	Rol          RolUsuario `gorm:"type:enum('admin','cajero','mesero');not null"           json:"rol"`
	Activo       bool       `gorm:"not null;default:1"                                     json:"activo"`
	CreatedAt    time.Time  `gorm:"autoCreateTime"                                         json:"created_at"`
}

func (User) TableName() string { return "usuarios" }
