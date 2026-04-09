// Package services errores tipados compartidos entre servicios.
// Los controllers mapean cada error a un código HTTP específico,
// manteniendo la capa de servicios libre de dependencias con net/http (SRP).
package services

import "errors"

// Errores de negocio relacionados con usuarios (HU008).
var (
	// ErrUsernameTaken indica que el username ya está registrado.
	ErrUsernameTaken = errors.New("username already taken")

	// ErrSedeRequired indica que el rol exige una sede y no se proporcionó.
	// Aplica a los roles cajero y mesero.
	ErrSedeRequired = errors.New("location is required for cashier and waiter")

	// ErrSedeNotAllowed indica que el rol no debe tener sede asignada.
	// Aplica al rol admin (acceso global).
	ErrSedeNotAllowed = errors.New("administrator must not have a location")

	// ErrSedeNotFound indica que la sede referenciada no existe en BD.
	ErrSedeNotFound = errors.New("location not found")

	// ErrInvalidRole indica que el rol enviado no es uno de los valores permitidos.
	ErrInvalidRole = errors.New("invalid role")

	// ErrPasswordRequired indica que no se proporcionó contraseña al crear.
	ErrPasswordRequired = errors.New("password is required")
)
