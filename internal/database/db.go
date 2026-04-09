package database

import (
	"fmt"
	"log"

	"golang.org/x/crypto/bcrypt"
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

	log.Println("Database connection established successfully.")
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
	seedUsuarios(db)
}

func seedSedes(db *gorm.DB) {
	var count int64
	db.Model(&models.Venue{}).Count(&count)
	if count > 0 {
		return
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

func seedUsuarios(db *gorm.DB) {
	var count int64
	db.Model(&models.User{}).Count(&count)
	if count > 0 {
		return // ya tiene usuarios, no vuelve a insertar
	}

	// Obtener las sedes creadas previamente
	var sedes []models.Venue
	if err := db.Find(&sedes).Error; err != nil || len(sedes) < 3 {
		log.Println("Seed usuarios: no se encontraron las 3 sedes, abortando")
		return
	}

	// Mapear sedes por nombre para mayor claridad
	sedeID := map[string]uint{}
	for _, s := range sedes {
		sedeID[s.Nombre] = s.ID
	}

	// Definición de usuarios a crear (HU008: identificador primario = username).
	// Formato: username, email, nombre, rol, sedeNombre ("" = admin global sin sede)
	type usuarioSeed struct {
		Username string
		Email    string
		Nombre   string
		Password string
		Rol      models.RolUsuario
		Sede     string
	}

	seeds := []usuarioSeed{
		// Admin global (sin sede)
		{"admin", "admin@bar.com", "Admin Principal", "admin123", models.RolAdmin, ""},

		// Galerías
		{"cajero.galerias", "cajero.galerias@bar.com", "Carlos Galerías", "cajero123", models.RolCajero, "Galerías"},
		{"mesero.galerias", "mesero.galerias@bar.com", "María Galerías", "mesero123", models.RolMesero, "Galerías"},

		// Restrepo
		{"cajero.restrepo", "cajero.restrepo@bar.com", "Luis Restrepo", "cajero123", models.RolCajero, "Restrepo"},
		{"mesero.restrepo", "mesero.restrepo@bar.com", "Ana Restrepo", "mesero123", models.RolMesero, "Restrepo"},

		// Zona T
		{"cajero.zonat", "cajero.zonat@bar.com", "Pedro Zona T", "cajero123", models.RolCajero, "Zona T"},
		{"mesero.zonat", "mesero.zonat@bar.com", "Laura Zona T", "mesero123", models.RolMesero, "Zona T"},
	}

	for _, s := range seeds {
		hash, err := bcrypt.GenerateFromPassword([]byte(s.Password), 12)
		if err != nil {
			log.Printf("Seed usuarios: error hasheando password para %s: %v", s.Username, err)
			continue
		}

		email := s.Email
		u := models.User{
			Username:     s.Username,
			Email:        &email,
			Nombre:       s.Nombre,
			PasswordHash: string(hash),
			Rol:          s.Rol,
			Activo:       true,
		}

		if s.Sede != "" {
			id := sedeID[s.Sede]
			u.SedeID = &id
		}

		if err := db.Create(&u).Error; err != nil {
			log.Printf("Seed usuarios: error creando %s: %v", s.Username, err)
		}
	}

	log.Println("Seed: usuarios insertados")
}
