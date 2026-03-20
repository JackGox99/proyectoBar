package models

import "time"

type EstadoPedido string

const (
	EstadoAbierto EstadoPedido = "abierto"
	EstadoPagado  EstadoPedido = "pagado"
)

type Order struct {
	ID        uint         `gorm:"primaryKey"                                json:"id"`
	SedeID    uint         `gorm:"not null"                                  json:"sede_id"`
	Sede      Venue        `gorm:"foreignKey:SedeID"                         json:"sede,omitempty"`
	UsuarioID uint         `gorm:"not null"                                  json:"usuario_id"`
	Usuario   User         `gorm:"foreignKey:UsuarioID"                      json:"usuario,omitempty"`
	Estado    EstadoPedido `gorm:"type:enum('abierto','pagado');not null;default:'abierto'" json:"estado"`
	CreatedAt time.Time    `gorm:"autoCreateTime"                            json:"created_at"`
	CerradoAt *time.Time   `                                                 json:"cerrado_at"`
}

func (Order) TableName() string { return "pedidos" }
