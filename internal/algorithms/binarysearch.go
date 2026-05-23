// Package algorithms — ver quicksort.go para la descripción del paquete.
//
// ─── DÓNDE SE USA EN EL PROYECTO ────────────────────────────────────────────
//   Archivo : internal/services/inventory_service.go
//   Función : inventoryService.SearchByProductName(venueID uint, name, algo string)
//
//   Endpoints HTTP que disparan estas funciones:
//     - GET /api/v1/inventory?search=<nombre>           → BinarySearchRecursive
//                                                         (variante por defecto)
//     - GET /api/v1/inventory/binary-search?name=&algo= → la que pida el cliente:
//                                                         "iterative"  → BinarySearchIterative
//                                                         "recursive"  → BinarySearchRecursive
//
//   El endpoint /binary-search es la demo educativa: la UI de Inventory
//   tiene un toggle Iterative/Recursive que dispara este endpoint y muestra
//   qué variante respondió, ilustrando la diferencia iterativo/recursivo
//   vista en clase (paralelo al ejemplo del Factorial).
//
//   En ambos casos el servicio:
//     1. Trae el inventario de la sede con FindByVenueID (O(n) DB).
//     2. Ordena con MergeSort por nombre de producto (O(n log n)).
//     3. Aplica la variante de binary search seleccionada (O(log n)).
package algorithms

import "strings"

// BinarySearchIterative busca un elemento en un slice ya ordenado usando
// el enfoque iterativo (equivalente al factorial con for).
//
// Complejidad:
//   - Tiempo: O(log n) — en cada iteración descarta la mitad del slice.
//   - Espacio: O(1) — solo usa variables low, mid, high.
//
// Retorna el índice del elemento encontrado, o -1 si no existe.
func BinarySearchIterative[T any](data []T, target string, key func(T) string) int {
	low := 0
	high := len(data) - 1

	for low <= high {
		mid := low + (high-low)/2
		midVal := strings.ToLower(key(data[mid]))
		tgt := strings.ToLower(target)

		if midVal == tgt {
			return mid
		} else if midVal < tgt {
			low = mid + 1
		} else {
			high = mid - 1
		}
	}

	return -1
}

// BinarySearchRecursive busca un elemento en un slice ya ordenado usando
// el enfoque recursivo (equivalente al factorial con llamada a sí mismo).
//
// Complejidad:
//   - Tiempo: O(log n) — misma lógica que la iterativa.
//   - Espacio: O(log n) — por la pila de recursión (una llamada por nivel).
//
// Retorna el índice del elemento encontrado, o -1 si no existe.
func BinarySearchRecursive[T any](data []T, target string, key func(T) string) int {
	return binarySearchRec(data, target, key, 0, len(data)-1)
}

func binarySearchRec[T any](data []T, target string, key func(T) string, low, high int) int {
	// Caso base: no se encontró el elemento.
	if low > high {
		return -1
	}

	mid := low + (high-low)/2
	midVal := strings.ToLower(key(data[mid]))
	tgt := strings.ToLower(target)

	if midVal == tgt {
		return mid // Caso base: encontrado.
	} else if midVal < tgt {
		return binarySearchRec(data, target, key, mid+1, high) // Buscar en mitad derecha.
	}
	return binarySearchRec(data, target, key, low, mid-1) // Buscar en mitad izquierda.
}
