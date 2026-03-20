package models

// RolUsuario representa los roles posibles de un usuario.
// Se almacena como ENUM en la tabla usuarios, no como tabla separada.
type RolUsuario string

const (
	RolAdmin  RolUsuario = "admin"
	RolCajero RolUsuario = "cajero"
	RolMesero RolUsuario = "mesero"
)
