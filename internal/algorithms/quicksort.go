// Package algorithms implementa algoritmos clásicos de ordenamiento
// para la materia Diseño de Algoritmos. Se usan en producción dentro
// del servicio de usuarios para ordenar resultados.
package algorithms

// QuickSort ordena un slice in-place usando el algoritmo Quick Sort.
//
// Complejidad:
//   - Promedio: O(n log n)
//   - Peor caso: O(n²) — cuando el pivote siempre es el menor o mayor elemento.
//   - Espacio: O(log n) por la pila de recursión.
//
// Estrategia de pivote: último elemento (Lomuto partition scheme).
// El parámetro `less` define el criterio de orden: less(a, b) == true significa que a va antes que b.
func QuickSort[T any](data []T, less func(a, b T) bool) {
	quickSortRange(data, 0, len(data)-1, less)
}

func quickSortRange[T any](data []T, low, high int, less func(a, b T) bool) {
	if low >= high {
		return
	}

	pivotIdx := partition(data, low, high, less)
	quickSortRange(data, low, pivotIdx-1, less)
	quickSortRange(data, pivotIdx+1, high, less)
}

// partition reorganiza el slice para que todos los elementos menores que el
// pivote queden a la izquierda y los mayores a la derecha (Lomuto scheme).
// Retorna la posición final del pivote.
func partition[T any](data []T, low, high int, less func(a, b T) bool) int {
	pivot := data[high]
	i := low - 1

	for j := low; j < high; j++ {
		if less(data[j], pivot) {
			i++
			data[i], data[j] = data[j], data[i]
		}
	}

	data[i+1], data[high] = data[high], data[i+1]
	return i + 1
}
