package models

import "time"

type Product struct {
	ID          uint      `gorm:"primaryKey"                   json:"id"`
	CategoriaID uint      `gorm:"not null"                     json:"categoria_id"`
	Categoria   Category  `gorm:"foreignKey:CategoriaID"       json:"categoria,omitempty"`
	Nombre      string    `gorm:"size:150;not null"            json:"nombre"`
	Descripcion string    `gorm:"type:text"                    json:"descripcion"`
	Precio      float64   `gorm:"type:decimal(10,2);not null"  json:"precio"`
	Activo      bool      `gorm:"not null;default:1"           json:"activo"`
	CreatedAt   time.Time `gorm:"autoCreateTime"               json:"created_at"`
}

func (Product) TableName() string { return "productos" }
