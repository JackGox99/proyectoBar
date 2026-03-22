# Arquitectura del Sistema — Bar Inventory API

## Resumen

API REST construida en **Go** usando **Gin** como framework HTTP y **GORM** como ORM sobre **MySQL**.
La arquitectura sigue un modelo de **capas con inyección de dependencias basada en interfaces**,
aplicando los principios SOLID a lo largo de todo el stack.

---

## Diagrama de Capas

```
┌─────────────────────────────────────────────────────────────────┐
│  cmd/api/main.go          — Punto de entrada (solo orquesta)    │
└───────────────────────────────┬─────────────────────────────────┘
                                │
┌───────────────────────────────▼─────────────────────────────────┐
│  internal/server/server.go    — Composition Root + Server       │
│  · Construye el grafo de dependencias                           │
│  · Registra middlewares                                         │
│  · Delega rutas a routes.Register                               │
└───────┬───────────────────────────────────────────┬─────────────┘
        │                                           │
┌───────▼──────────┐                   ┌────────────▼────────────┐
│  internal/routes │                   │  internal/middleware    │
│  · Define URLs   │                   │  · AuthRequired (JWT)   │
│  · Agrupa recursos REST              └─────────────────────────┘
└───────┬──────────┘
        │
┌───────▼──────────────────────────────────────────────────────────┐
│  internal/controllers/        — Capa HTTP                        │
│  · Parsea request, llama al service, serializa response JSON     │
│  · Depende de interfaces de services (no de implementaciones)    │
└───────┬──────────────────────────────────────────────────────────┘
        │  (interfaces)
┌───────▼──────────────────────────────────────────────────────────┐
│  internal/services/           — Capa de Lógica de Negocio        │
│  · Orquesta operaciones, aplica reglas de negocio                │
│  · Depende de interfaces de repository (no de GORM directamente) │
└───────┬──────────────────────────────────────────────────────────┘
        │  (interfaces)
┌───────▼──────────────────────────────────────────────────────────┐
│  internal/repository/         — Capa de Acceso a Datos           │
│  · Implementaciones GORM de las interfaces de repositorio        │
│  · Único lugar donde existe código SQL/GORM                      │
└───────┬──────────────────────────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────────────────────┐
│  internal/models/             — Entidades de Dominio             │
│  · Structs GORM con json tags                                    │
│  · Sin lógica de negocio ni dependencias HTTP                    │
└──────────────────────────────────────────────────────────────────┘
        │
┌───────▼──────────────────────────────────────────────────────────┐
│  MySQL (Docker) ← internal/database/db.go                        │
└──────────────────────────────────────────────────────────────────┘
```

---

## Flujo de una petición HTTP

```
[Cliente HTTP]
      │  POST /api/v1/orders
      ▼
[Gin Router]
      │  authMiddleware (valida JWT)
      ▼
[OrderController.Create]
      │  bind JSON → models.Order
      ▼
[OrderService.Create]
      │  o.Estado = "abierto"  ← regla de negocio
      ▼
[OrderRepository.Create]
      │  db.Create(&order)     ← única línea GORM
      ▼
[MySQL]
      │  INSERT INTO pedidos...
      ▼
[Response JSON 201]
```

---

## Principios SOLID aplicados

### S — Single Responsibility Principle
Cada paquete tiene exactamente una razón para cambiar:

| Paquete | Razón de cambio |
|---|---|
| `models` | Cambia el esquema de BD |
| `repository` | Cambia el ORM o motor de BD |
| `services` | Cambia una regla de negocio |
| `controllers` | Cambia el formato de la API |
| `routes` | Cambia la estructura de URLs |
| `server` | Cambia la inicialización o el framework |
| `middleware` | Cambia la estrategia de autenticación |

### O — Open/Closed Principle
Para agregar un nuevo recurso (ej: `Mesa`):
1. Crear `models/mesa.go`
2. Crear `repository/mesa_repository.go` (interfaz + impl)
3. Crear `services/mesa_service.go` (interfaz + impl)
4. Crear `controllers/mesa_controller.go`
5. Agregar `Mesa *MesaController` a `routes.Controllers`
6. Agregar rutas en `routes.Register`

**Ningún archivo existente necesita ser modificado** — solo adición.

### L — Liskov Substitution Principle
Cualquier implementación alternativa de `UserRepository` (ej: PostgreSQL, Redis cache, mock para tests)
puede reemplazar a `userRepository` sin cambiar `userService` ni `UserController`.

### I — Interface Segregation Principle
Las interfaces son pequeñas y enfocadas en un rol. `ReportService` solo conoce los métodos
de reporte — no hereda métodos de `OrderService`. `PaymentRepository` expone solo 3 métodos
en lugar de compartir interfaz con `OrderRepository`.

### D — Dependency Inversion Principle
```
Controller  →  depende de →  services.OrderService (interfaz)
Service     →  depende de →  repository.OrderRepository (interfaz)
Repository  →  depende de →  *gorm.DB (detalle de implementación — oculto)
```
Los módulos de alto nivel (controllers) nunca importan `gorm.io/gorm`.

---

## Composition Root

`internal/server/server.go` es el **único archivo** donde se instancian objetos concretos y se
ensambla el grafo de dependencias. Esta es la aplicación del patrón **Composition Root**:

```go
// server.go — setupRoutes()
userRepo := repository.NewUserRepository(s.db)   // concreto
userSvc  := services.NewUserService(userRepo)     // concreto
ctrl     := controllers.NewUserController(userSvc) // concreto

// A partir de aquí todo el código trabaja con interfaces
```

Ventaja: para hacer un test de integración, se puede crear un `Server` de prueba con un DB
de test — sin tocar ningún otro archivo.

---

## Grafo de dependencias (sin ciclos)

```
main
 └── server
      ├── config
      ├── database
      ├── repository  ──→  models
      ├── services    ──→  repository, models, config
      ├── controllers ──→  services
      ├── routes      ──→  controllers
      └── middleware
```

Go garantiza en tiempo de compilación que no haya ciclos de importación.

---

## Decisiones de diseño

Ver [docs/decisions.md](decisions.md) para el registro completo de decisiones arquitectónicas (ADRs).

Ver [docs/modelo_relacional.md](modelo_relacional.md) para el modelo entidad-relación y sus decisiones de diseño.
