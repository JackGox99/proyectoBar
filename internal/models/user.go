package models

import "time"

// User representa al personal del bar (admin, cajero, mesero).
//
// HU008: el identificador de login es `Username` (único). `Email` queda como
// dato de contacto opcional para mantener compatibilidad con usuarios previos.
type User struct {
	ID           uint       `gorm:"primaryKey"                                             json:"id"`
	SedeID       *uint      `                                                              json:"sede_id"`
	Sede         *Venue     `gorm:"foreignKey:SedeID"                                      json:"sede,omitempty"`
	Username     string     `gorm:"size:50;uniqueIndex;not null"                           json:"username"`
	Nombre       string     `gorm:"size:150;not null"                                      json:"nombre"`
	Email        *string    `gorm:"size:150"                                               json:"email,omitempty"`
	PasswordHash string     `gorm:"size:255;not null"                                      json:"-"`
	Rol          RolUsuario `gorm:"type:enum('admin','cajero','mesero');not null"          json:"rol"`
	Activo       bool       `gorm:"not null;default:1"                                     json:"activo"`
	CreatedAt    time.Time  `gorm:"autoCreateTime"                                         json:"created_at"`
}

func (User) TableName() string { return "usuarios" }
