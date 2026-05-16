package repository

import (
	"errors"

	"gorm.io/gorm"

	"bar-inventory-api/internal/models"
)

// ErrProductNotFound se retorna cuando el producto no existe o fue desactivado.
var ErrProductNotFound = errors.New("product not found")

// InventoryRepository define el contrato de acceso a datos para inventario.
type InventoryRepository interface {
	FindAll() ([]models.Inventory, error)
	FindByID(id uint) (*models.Inventory, error)
	FindByVenueID(venueID uint) ([]models.Inventory, error)
	FindByVenueAndProduct(venueID, productID uint) (*models.Inventory, error)
	Create(inv *models.Inventory) error
	Update(inv *models.Inventory) error
	AddMovement(mov *models.InventoryMovement) error
	// AddStock suma cantidad al stock_actual del (sede, producto) y registra el movimiento
	// de tipo "entrada" en una única transacción. Si la fila de inventario no existe,
	// se crea con stock_actual=cantidad. Valida que el producto esté activo.
	AddStock(venueID, productID uint, quantity int, userID uint) (*models.Inventory, error)
	// FindEntryMovements retorna los movimientos de tipo "entrada" (HU020).
	// - venueID nil = sin filtro (admin viendo todas las sedes).
	// - productSearch != "" filtra por nombre de producto (LIKE case-insensitive).
	// Resultados en orden cronológico descendente (más reciente primero).
	FindEntryMovements(venueID *uint, productSearch string) ([]models.InventoryMovement, error)
}

type inventoryRepository struct {
	db *gorm.DB
}

func NewInventoryRepository(db *gorm.DB) InventoryRepository {
	return &inventoryRepository{db: db}
}

// FindAll retorna inventario solo de productos activos (HU016).
func (r *inventoryRepository) FindAll() ([]models.Inventory, error) {
	var items []models.Inventory
	return items, r.db.
		Joins("JOIN productos ON productos.id = inventario.producto_id AND productos.activo = ?", true).
		Preload("Sede").Preload("Producto").Preload("Producto.Categoria").
		Find(&items).Error
}

func (r *inventoryRepository) FindByID(id uint) (*models.Inventory, error) {
	var item models.Inventory
	return &item, r.db.Preload("Sede").Preload("Producto").Preload("Producto.Categoria").First(&item, id).Error
}

// FindByVenueID retorna inventario de la sede solo con productos activos (HU016).
func (r *inventoryRepository) FindByVenueID(venueID uint) ([]models.Inventory, error) {
	var items []models.Inventory
	return items, r.db.
		Joins("JOIN productos ON productos.id = inventario.producto_id AND productos.activo = ?", true).
		Where("inventario.sede_id = ?", venueID).
		Preload("Producto").Preload("Producto.Categoria").
		Find(&items).Error
}

func (r *inventoryRepository) FindByVenueAndProduct(venueID, productID uint) (*models.Inventory, error) {
	var item models.Inventory
	return &item, r.db.Where("sede_id = ? AND producto_id = ?", venueID, productID).First(&item).Error
}

func (r *inventoryRepository) Create(inv *models.Inventory) error {
	return r.db.Create(inv).Error
}

func (r *inventoryRepository) Update(inv *models.Inventory) error {
	return r.db.Save(inv).Error
}

func (r *inventoryRepository) AddMovement(mov *models.InventoryMovement) error {
	return r.db.Create(mov).Error
}

// FindEntryMovements retorna las entradas manuales para el historial (HU020).
// - JOIN con inventario para filtrar por sede.
// - JOIN con productos solo si hay búsqueda por nombre.
// - Solo tipo="entrada" (HU018); otros tipos son auditorías distintas.
// - Orden DESC por fecha para mostrar primero el movimiento más reciente.
func (r *inventoryRepository) FindEntryMovements(venueID *uint, productSearch string) ([]models.InventoryMovement, error) {
	var movements []models.InventoryMovement

	q := r.db.
		Joins("JOIN inventario ON inventario.id = movimientos_inventario.inventario_id").
		Where("movimientos_inventario.tipo = ?", models.TipoEntrada).
		Preload("Usuario").
		Preload("Inventario.Producto").
		Preload("Inventario.Sede")

	if venueID != nil {
		q = q.Where("inventario.sede_id = ?", *venueID)
	}
	if productSearch != "" {
		q = q.
			Joins("JOIN productos ON productos.id = inventario.producto_id").
			Where("LOWER(productos.nombre) LIKE LOWER(?)", "%"+productSearch+"%")
	}

	return movements, q.Order("movimientos_inventario.fecha DESC").Find(&movements).Error
}

// AddStock registra una entrada manual (HU018).
// - Valida que el producto exista y esté activo.
// - Suma cantidad al stock_actual; crea la fila de inventario si no existe.
// - Registra el movimiento de tipo "entrada" para trazabilidad.
// Toda la operación se ejecuta en una única transacción.
func (r *inventoryRepository) AddStock(venueID, productID uint, quantity int, userID uint) (*models.Inventory, error) {
	var inv models.Inventory

	err := r.db.Transaction(func(tx *gorm.DB) error {
		// 1) Validar que el producto exista y esté activo.
		var prod models.Product
		if err := tx.Select("id", "activo").First(&prod, productID).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return ErrProductNotFound
			}
			return err
		}
		if !prod.Activo {
			return ErrProductNotFound
		}

		// 2) Buscar o crear la fila de inventario (sede, producto).
		res := tx.Where("sede_id = ? AND producto_id = ?", venueID, productID).First(&inv)
		if res.Error != nil {
			if !errors.Is(res.Error, gorm.ErrRecordNotFound) {
				return res.Error
			}
			inv = models.Inventory{
				SedeID:      venueID,
				ProductoID:  productID,
				StockActual: quantity,
			}
			if err := tx.Create(&inv).Error; err != nil {
				return err
			}
		} else {
			inv.StockActual += quantity
			if err := tx.Save(&inv).Error; err != nil {
				return err
			}
		}

		// 3) Registrar el movimiento de entrada.
		mov := models.InventoryMovement{
			InventarioID: inv.ID,
			UsuarioID:    userID,
			Tipo:         models.TipoEntrada,
			Cantidad:     quantity,
			Motivo:       "Manual stock entry",
		}
		return tx.Create(&mov).Error
	})
	if err != nil {
		return nil, err
	}

	// Recargar con relaciones para respuesta del endpoint.
	if err := r.db.Preload("Producto").Preload("Producto.Categoria").Preload("Sede").First(&inv, inv.ID).Error; err != nil {
		return nil, err
	}
	return &inv, nil
}
