// Package algorithms — Algoritmo Voraz: Cambio de Monedas (Greedy Coin Change)
//
// ─── DÓNDE SE USA EN EL PROYECTO ────────────────────────────────────────────
//   Archivo : internal/controllers/order_controller.go
//   Función : OrderController.Finalize()
//   Cuándo  : Cuando el método de pago es "efectivo" y el cajero envía el
//             campo opcional "monto_entregado" en el body del POST /orders/:id/finalize.
//             Si monto_entregado > total_orden, el controlador llama
//             CoinChangeFromRegister() pasando el stock actual de la caja.
//             El resultado incluye qué billetes/monedas se usaron y si fue
//             posible dar el cambio exacto con el stock disponible.
//
// ─── DESCRIPCIÓN DEL ALGORITMO ──────────────────────────────────────────────
//   Estrategia voraz (greedy): en cada paso selecciona la denominación más
//   alta posible que no supere el monto restante Y que tenga unidades
//   disponibles en la caja registradora. Reduce el restante y repite.
//   No hay retroceso ni exploración de alternativas — una sola pasada basta.
//
//   Esto es correcto para el sistema monetario colombiano porque sus
//   denominaciones forman un conjunto canónico: la greedy siempre produce
//   el mínimo número de billetes/monedas posible (cuando hay stock suficiente).
//
//   Complejidad:
//     Tiempo  O(d)  — d = número de denominaciones (constante = 10 en COP).
//     Espacio O(d)  — para la lista de resultado.
//
// ─── COMPARACIÓN CON VERSIÓN RECURSIVA ──────────────────────────────────────
//   CoinChangeFromRegister usa un for iterativo (equivalente al Factorial
//   iterativo visto en clase). La versión recursiva requeriría memoización
//   (programación dinámica) para conjuntos no canónicos; con denominaciones
//   COP la iterativa es suficiente y más eficiente en espacio.
package algorithms

// DenominationCount representa cuántos billetes/monedas de cierta denominación
// se entregan como parte del cambio.
type DenominationCount struct {
	Denominacion int `json:"denominacion"`
	Cantidad     int `json:"cantidad"`
}

// ChangeResult agrupa el total del cambio, su desglose por denominación y si
// fue posible dar el cambio exacto con el stock disponible en caja.
type ChangeResult struct {
	TotalCambio    int                 `json:"total_cambio"`
	Denominaciones []DenominationCount `json:"denominaciones"`
	CambioExacto   bool                `json:"cambio_exacto"` // false si la caja no tiene suelto suficiente
}

// CashRegisterStock mapea cada denominación (en pesos COP) a la cantidad de
// billetes/monedas disponibles en la caja registradora.
type CashRegisterStock map[int]int

// denominacionesCOP lista las denominaciones del peso colombiano de mayor a menor.
// El orden descendente es requisito del algoritmo voraz.
var denominacionesCOP = []int{50000, 20000, 10000, 5000, 2000, 1000, 500, 200, 100, 50}

// DefaultCashRegister representa el stock inicial típico de una caja de bar.
// Se usa en el controlador cuando el cajero no especifica su stock real.
// En producción esto podría leerse de la BD para persistir entre turnos.
var DefaultCashRegister = CashRegisterStock{
	50000: 3,
	20000: 5,
	10000: 10,
	5000:  15,
	2000:  20,
	1000:  30,
	500:   40,
	200:   50,
	100:   50,
	50:    100,
}

// CoinChangeFromRegister calcula el desglose óptimo de billetes y monedas para
// dar totalPesos de cambio, respetando el stock disponible en la caja registradora.
//
// Parámetros:
//   - stock : mapa denominación → cantidad disponible en caja (se lee pero NO se modifica).
//   - totalPesos : monto de cambio a entregar en pesos COP enteros.
//
// Retorna el ChangeResult con CambioExacto=true si se pudo dar el vuelto exacto,
// o CambioExacto=false si la caja no tiene suficiente suelto (el cajero deberá
// buscar otra combinación o pedir al cliente un monto más exacto).
func CoinChangeFromRegister(stock CashRegisterStock, totalPesos int) ChangeResult {
	result := ChangeResult{
		TotalCambio:    totalPesos,
		Denominaciones: []DenominationCount{},
		CambioExacto:   false,
	}
	if totalPesos <= 0 {
		result.CambioExacto = true
		return result
	}

	remaining := totalPesos

	// Paso voraz: por cada denominación (de mayor a menor), tomar tantas
	// unidades como sea posible sin superar el restante y sin exceder el stock.
	for _, d := range denominacionesCOP {
		if remaining <= 0 {
			break
		}
		disponibles := stock[d] // unidades disponibles en caja para esta denominación
		if disponibles == 0 {
			continue
		}
		necesarias := remaining / d       // cuántas necesitaríamos con supply infinito
		usar := min(necesarias, disponibles) // limitado por el stock real de caja
		if usar > 0 {
			result.Denominaciones = append(result.Denominaciones, DenominationCount{
				Denominacion: d,
				Cantidad:     usar,
			})
			remaining -= usar * d
		}
	}

	result.CambioExacto = remaining == 0
	return result
}

// min retorna el menor de dos enteros.
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}
