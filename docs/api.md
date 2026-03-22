# API Reference — Bar Inventory API

**Base URL:** `http://localhost:8080`
**Versión:** v1
**Formato:** JSON (`Content-Type: application/json`)

---

## Health Check

| Método | Endpoint | Auth | Descripción |
|---|---|---|---|
| GET | `/health` | No | Verificar que el servidor está activo |

**Response 200 OK:**
```json
{
  "status": "ok",
  "message": "Server is running"
}
```

---

## Autenticación — `/api/v1/auth`

Rutas **públicas** (no requieren JWT).

| Método | Endpoint | Descripción |
|---|---|---|
| POST | `/api/v1/auth/login` | Iniciar sesión, obtener JWT |
| POST | `/api/v1/auth/logout` | Cerrar sesión |

**POST /login — Body:**
```json
{
  "email": "admin@bar.com",
  "password": "password123"
}
```

**POST /login — Response 200:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs..."
}
```

> Todas las rutas siguientes requieren header: `Authorization: Bearer <token>`

---

## Usuarios — `/api/v1/users`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/v1/users` | Listar todos los usuarios |
| GET | `/api/v1/users/:id` | Obtener usuario por ID |
| POST | `/api/v1/users` | Crear nuevo usuario |
| PUT | `/api/v1/users/:id` | Actualizar usuario |
| DELETE | `/api/v1/users/:id` | Eliminar usuario |

**Roles de usuario:** `admin` · `cajero` · `mesero`

---

## Categorías — `/api/v1/categories`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/v1/categories` | Listar categorías |
| GET | `/api/v1/categories/:id` | Obtener categoría por ID |
| POST | `/api/v1/categories` | Crear categoría |
| PUT | `/api/v1/categories/:id` | Actualizar categoría |
| DELETE | `/api/v1/categories/:id` | Eliminar categoría |

---

## Productos — `/api/v1/products`

Catálogo global de productos (maestro compartido entre sedes).

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/v1/products` | Listar productos (con categoría) |
| GET | `/api/v1/products/:id` | Obtener producto por ID |
| POST | `/api/v1/products` | Crear producto |
| PUT | `/api/v1/products/:id` | Actualizar producto |
| DELETE | `/api/v1/products/:id` | Eliminar producto |

---

## Inventario — `/api/v1/inventory`

Stock por sede-producto. Cada registro es único por `(sede_id, producto_id)`.

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/v1/inventory` | Listar registros de inventario |
| GET | `/api/v1/inventory/:id` | Obtener registro por ID |
| POST | `/api/v1/inventory` | Crear registro de inventario |
| PUT | `/api/v1/inventory/:id` | Actualizar stock mínimo |
| POST | `/api/v1/inventory/:id/movements` | Registrar movimiento de stock |

**Tipos de movimiento:** `entrada` · `descuento_venta` · `ajuste_manual`

---

## Pedidos — `/api/v1/orders`

Flujo: mesero crea pedido (`abierto`) → agrega ítems → cajero paga (`pagado`).

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/v1/orders` | Listar pedidos |
| GET | `/api/v1/orders/:id` | Obtener pedido por ID |
| POST | `/api/v1/orders` | Crear pedido (estado inicial: `abierto`) |
| PUT | `/api/v1/orders/:id` | Actualizar pedido |
| POST | `/api/v1/orders/:id/items` | Agregar ítem al pedido |
| POST | `/api/v1/orders/:id/pay` | Pagar pedido (genera registro en `pagos`) |

**Métodos de pago:** `efectivo` · `tarjeta_credito` · `tarjeta_debito`

---

## Reportes — `/api/v1/reports`

| Método | Endpoint | Descripción |
|---|---|---|
| GET | `/api/v1/reports/sales` | Reporte de ventas |
| GET | `/api/v1/reports/inventory` | Reporte de estado de inventario |

---

## Códigos de estado HTTP usados

| Código | Significado |
|---|---|
| 200 OK | Consulta exitosa |
| 201 Created | Recurso creado |
| 400 Bad Request | Datos de entrada inválidos |
| 401 Unauthorized | Token ausente o inválido |
| 403 Forbidden | Sin permisos para el recurso |
| 404 Not Found | Recurso no encontrado |
| 409 Conflict | Violación de restricción única (ej: email duplicado) |
| 500 Internal Server Error | Error inesperado del servidor |
| 501 Not Implemented | Endpoint aún no implementado |

---

## Sedes (solo lectura, se alimentan por seed)

| ID | Nombre | Dirección |
|---|---|---|
| 1 | Galerías | Dirección Galerías |
| 2 | Restrepo | Dirección Restrepo |
| 3 | Zona T | Dirección Zona T |
