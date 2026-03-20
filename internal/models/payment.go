package models

import "time"

type MetodoPago string

const (
	MetodoEfectivo       MetodoPago = "efectivo"
	MetodoTarjetaCredito MetodoPago = "tarjeta_credito"
	MetodoTarjetaDebito  MetodoPago = "tarjeta_debito"
)

type Payment struct {
	ID         uint       `gorm:"primaryKey"                                                           json:"id"`
	PedidoID   uint       `gorm:"uniqueIndex;not null"                                                 json:"pedido_id"`
	Pedido     Order      `gorm:"foreignKey:PedidoID"                                                  json:"pedido,omitempty"`
	UsuarioID  uint       `gorm:"not null"                                                             json:"usuario_id"`
	Usuario    User       `gorm:"foreignKey:UsuarioID"                                                 json:"usuario,omitempty"`
	Total      float64    `gorm:"type:decimal(10,2);not null"                                          json:"total"`
	MetodoPago MetodoPago `gorm:"type:enum('efectivo','tarjeta_credito','tarjeta_debito');not null"     json:"metodo_pago"`
	Fecha      time.Time  `gorm:"autoCreateTime"                                                       json:"fecha"`
}

func (Payment) TableName() string { return "pagos" }
