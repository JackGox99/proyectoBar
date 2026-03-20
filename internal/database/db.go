package database

import (
	"fmt"
	"log"

	"gorm.io/driver/mysql"
	"gorm.io/gorm"

	"bar-inventory-api/config"
	"bar-inventory-api/internal/models"
)

func Connect(cfg *config.Config) *gorm.DB {
	dsn := fmt.Sprintf(
		"%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local",
		cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName,
	)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Error conectando a la base de datos: %v", err)
	}

	log.Println("Conexión a la base de datos exitosa")
	return db
}

func AutoMigrate(db *gorm.DB) {
	err := db.AutoMigrate(
		&models.Venue{},
		&models.User{},
		&models.Category{},
		&models.Product{},
		&models.Inventory{},
		&models.InventoryMovement{},
		&models.Order{},
		&models.OrderItem{},
		&models.Payment{},
	)
	if err != nil {
		log.Fatalf("Error en AutoMigrate: %v", err)
	}
	log.Println("AutoMigrate completado")
}

func Seed(db *gorm.DB) {
	seedSedes(db)
}

func seedSedes(db *gorm.DB) {
	var count int64
	db.Model(&models.Venue{}).Count(&count)
	if count > 0 {
		return // ya tiene datos, no vuelve a insertar
	}

	sedes := []models.Venue{
		{Nombre: "Galerías", Direccion: "Dirección Galerías", Activa: true},
		{Nombre: "Restrepo", Direccion: "Dirección Restrepo", Activa: true},
		{Nombre: "Zona T", Direccion: "Dirección Zona T", Activa: true},
	}

	if err := db.Create(&sedes).Error; err != nil {
		log.Printf("Error en seed de sedes: %v", err)
		return
	}
	log.Println("Seed: sedes insertadas")
}
