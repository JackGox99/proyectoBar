package main

import (
	"log"

	"github.com/gin-gonic/gin"

	"bar-inventory-api/config"
	"bar-inventory-api/internal/database"
	"bar-inventory-api/internal/routes"
)

func main() {
	cfg := config.Load()

	db := database.Connect(cfg)
	database.AutoMigrate(db)
	database.Seed(db)

	r := gin.Default()
	routes.Register(r, db)

	log.Printf("Server running on :%s", cfg.Port)
	if err := r.Run(":" + cfg.Port); err != nil {
		log.Fatal(err)
	}
}
