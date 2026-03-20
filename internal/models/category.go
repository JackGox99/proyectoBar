package models

type Category struct {
	ID          uint   `gorm:"primaryKey"                   json:"id"`
	Nombre      string `gorm:"size:100;uniqueIndex;not null" json:"nombre"`
	Descripcion string `gorm:"type:text"                    json:"descripcion"`
}

func (Category) TableName() string { return "categorias" }
