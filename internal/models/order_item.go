package models

type OrderItem struct {
	ID             uint    `gorm:"primaryKey"                  json:"id"`
	PedidoID       uint    `gorm:"not null"                    json:"pedido_id"`
	ProductoID     uint    `gorm:"not null"                    json:"producto_id"`
	Producto       Product `gorm:"foreignKey:ProductoID"       json:"producto,omitempty"`
	Cantidad       int     `gorm:"not null"                    json:"cantidad"`
	PrecioUnitario float64 `gorm:"type:decimal(10,2);not null" json:"precio_unitario"`
	Notas          string  `gorm:"type:text"                   json:"notas"`
}

func (OrderItem) TableName() string { return "pedido_detalle" }
