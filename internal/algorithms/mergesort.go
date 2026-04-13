package algorithms

// MergeSort ordena un slice usando el algoritmo Merge Sort (divide and conquer).
//
// Complejidad:
//   - Todos los casos: O(n log n) — siempre divide a la mitad y merge recorre n.
//   - Espacio: O(n) — requiere slices auxiliares en cada merge.
//
// A diferencia de QuickSort, MergeSort es estable: preserva el orden relativo
// de elementos iguales. Esto es útil al ordenar usuarios por nombre cuando
// varios comparten el mismo apellido.
func MergeSort[T any](data []T, less func(a, b T) bool) []T {
	n := len(data)
	if n <= 1 {
		return data
	}

	mid := n / 2
	left := MergeSort(append([]T{}, data[:mid]...), less)
	right := MergeSort(append([]T{}, data[mid:]...), less)

	return merge(left, right, less)
}

// merge combina dos slices ya ordenados en uno solo, manteniendo el orden.
func merge[T any](left, right []T, less func(a, b T) bool) []T {
	result := make([]T, 0, len(left)+len(right))
	i, j := 0, 0

	for i < len(left) && j < len(right) {
		if less(left[i], right[j]) {
			result = append(result, left[i])
			i++
		} else {
			result = append(result, right[j])
			j++
		}
	}

	// Agregar los elementos restantes del slice que no se agotó.
	result = append(result, left[i:]...)
	result = append(result, right[j:]...)

	return result
}
