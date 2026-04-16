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

	// ErrPasswordTooShort indica que la contraseña no cumple el mínimo de caracteres (HU010).
	ErrPasswordTooShort = errors.New("password must be at least 8 characters long")

	// ErrPasswordMismatch indica que las contraseñas no coinciden (HU010).
	ErrPasswordMismatch = errors.New("passwords do not match")

	// ErrUserInactive indica que el usuario está desactivado y no puede iniciar sesión (HU011).
	ErrUserInactive = errors.New("user account is deactivated")

	// ErrCategoryNameRequired indica que no se proporcionó nombre de categoría (HU012).
	ErrCategoryNameRequired = errors.New("category name is required")

	// ErrCategoryNameTaken indica que ya existe una categoría con ese nombre (HU012).
	ErrCategoryNameTaken = errors.New("category name already exists")

	// ErrProductNameRequired indica que no se proporcionó nombre de producto (HU013).
	ErrProductNameRequired = errors.New("product name is required")

	// ErrProductNameTaken indica que ya existe un producto con ese nombre (HU013).
	ErrProductNameTaken = errors.New("product name already exists")

	// ErrCategoryNotFound indica que la categoría referenciada no existe (HU013).
	ErrCategoryNotFound = errors.New("category not found")

	// ErrInvalidPrice indica que el precio no es un entero positivo (HU014).
	ErrInvalidPrice = errors.New("price must be a positive integer")
)
