package models

type Venue struct {
	ID        uint   `gorm:"primaryKey"                    json:"id"`
	Nombre    string `gorm:"size:100;uniqueIndex;not null"  json:"nombre"`
	Direccion string `gorm:"size:255;not null"             json:"direccion"`
	Activa    bool   `gorm:"not null;default:1"            json:"activa"`
}

func (Venue) TableName() string { return "sedes" }
