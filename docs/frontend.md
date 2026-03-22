# Frontend — Guía técnica (HU004)

## Resumen

Single Page Application construida con **React 18 + Vite 5 + Tailwind CSS 3**.
Consume la API REST del backend Go mediante proxy transparente en desarrollo
y reverse proxy nginx en producción.

---

## Evaluación de arquitecturas

Se evaluaron cinco alternativas antes de elegir el stack.

### Criterios de evaluación

| Criterio | Peso | Descripción |
|---|---|---|
| Responsive out-of-the-box | Alto | Sidebar hamburger + grid fluido |
| Alineación con arquitectura backend | Alto | Componentización similar a capas SOLID |
| Complejidad de configuración | Medio | Costo de entrada del stack |
| Tamaño del bundle de producción | Medio | Impacto en tiempo de carga |
| Escalabilidad del código | Alto | Facilidad para agregar módulos futuros |

### Comparativa

| Stack | Responsive | Alineación | Complejidad | Bundle | Escalabilidad | Resultado |
|---|---|---|---|---|---|---|
| Vanilla HTML/CSS/JS | Manual | Baja | Mínima | ~5KB | Baja | Descartado |
| HTML + Bootstrap CDN | Alta | Baja | Mínima | ~200KB | Baja | Descartado |
| Vue 3 + Vite + Tailwind | Alta | Media | Media | ~40KB | Alta | Válido |
| **React + Vite + Tailwind** | **Alta** | **Alta** | **Media** | **~35KB** | **Alta** | **Elegido** |
| Next.js | Alta | Media | Alta | ~80KB | Alta | Sobre-ingeniería |

### Justificación de la elección

**React + Vite + Tailwind CSS** fue elegido por:

1. **Componentización = Capas SOLID**: cada módulo de negocio (inventario, pedidos,
   reportes) se implementa como un componente React independiente, igual que cada
   controller Go es independiente. Se puede agregar un módulo nuevo sin tocar los existentes
   (Open/Closed Principle en el frontend).

2. **Vite proxy**: `vite.config.js` redirige `/api/*` al backend `:8080` durante desarrollo.
   No se necesita configurar CORS ni levantar servicios adicionales para integrar frontend y backend.

3. **Tailwind responsive sin JS**: las clases `md:hidden` y `md:translate-x-0` resuelven
   el comportamiento del sidebar sin event listeners adicionales. El estado `sidebarOpen`
   en React solo se necesita para el toggle en mobile.

4. **Bundle pequeño**: Tailwind elimina en build todas las clases no usadas (PurgeCSS integrado).
   El CSS final es < 10KB. React + ReactDOM gzipped ≈ 42KB.

---

## Estructura de archivos

```
frontend/
├── index.html                     # Punto de montaje HTML (lang="en")
├── package.json                   # Dependencias y scripts npm
├── vite.config.js                 # Dev server port 3000, proxy /api → :8080
├── tailwind.config.js             # Paleta corporativa extendida
├── postcss.config.js              # Autoprefixer + Tailwind PostCSS
├── nginx.conf                     # Config nginx para producción (SPA fallback)
├── Dockerfile                     # Multi-stage: build node → serve nginx
├── .gitignore                     # node_modules/, dist/
└── src/
    ├── main.jsx                   # Bootstrap React, monta en #root
    ├── App.jsx                    # BrowserRouter + Routes + Layout
    ├── index.css                  # Variables CSS, resets, @layer components
    ├── components/
    │   └── layout/
    │       ├── Layout.jsx         # Shell: Header + Sidebar + <Outlet />
    │       ├── Header.jsx         # Logo, hamburger (móvil), botón Login
    │       └── Sidebar.jsx        # Nav lateral responsive
    └── pages/
        └── Dashboard.jsx          # Página principal (placeholder HU004)
```

---

## Paleta de colores corporativa

La paleta evoca un bar premium: tonos oscuros de madera, iluminación ámbar, acentos dorados.

| Token Tailwind | CSS Variable | Hex | Uso |
|---|---|---|---|
| `brand-primary` | `--color-brand-primary` | `#D4961A` | Logo, activos, bordes CTA |
| `brand-dark` | `--color-brand-dark` | `#1A0E02` | Texto sobre fondo dorado |
| `bar-base` | `--color-bg-base` | `#0D0805` | Fondo de página |
| `bar-surface` | `--color-bg-surface` | `#1C1208` | Cards, sidebar, header |
| `bar-elevated` | `--color-bg-elevated` | `#2B1A0B` | Dropdowns, tooltips, modales |
| `bar-border` | `--color-border` | `#3D2810` | Divisores y bordes sutiles |
| `bar-text` | `--color-text-primary` | `#F0E6D3` | Texto principal |
| `bar-muted` | `--color-text-muted` | `#A89070` | Texto secundario, placeholders |
| `bar-accent` | `--color-accent` | `#E07030` | CTAs secundarios, alertas |
| `bar-success` | `--color-success` | `#4CAF50` | Estados positivos, stock OK |
| `bar-error` | `--color-error` | `#EF5350` | Errores, stock bajo |
| `bar-warning` | `--color-warning` | `#FFC107` | Advertencias |

### Uso recomendado

```jsx
// Con clases Tailwind
<div className="bg-bar-surface border border-bar-border text-bar-text">

// Con CSS variables (para valores dinámicos o SVG)
<div style={{ color: 'var(--color-brand-primary)' }}>
```

---

## Componentes de layout

### Layout.jsx

Orquestador del shell de la aplicación. Gestiona el estado `sidebarOpen` con `useState`.

```
┌─────────────────────────────────────────────────────┐
│  <Header onMenuToggle={...} />  ← fixed, z-30       │
├──────────────┬──────────────────────────────────────┤
│ <Sidebar     │  <main>                              │
│  isOpen={..} │    <Outlet />  ← página activa       │
│  onClose={..}│  </main>                             │
│ />           │                                      │
└──────────────┴──────────────────────────────────────┘
```

**Comportamiento responsive:**
- `< 768px (md)`: sidebar oculto (`-translate-x-full`), hamburger visible
- `≥ 768px (md)`: sidebar siempre visible (`translate-x-0`), `main` tiene `margin-left: 240px`

### Header.jsx

| Elemento | Desktop | Mobile |
|---|---|---|
| Hamburger button | `display: none` (md:hidden) | Visible |
| Logo mark (cuadrado dorado) | Visible | Visible |
| "Bar Inventory" texto | Visible | Visible |
| Botón Login | Visible | Visible |

### Sidebar.jsx

- Overlay semitransparente (`bg-black/60`) en mobile cuando está abierto
- `NavLink` con `isActive` aplica la clase `.nav-item.active` (borde izquierdo dorado)
- Cierra automáticamente al hacer click en un enlace o en el overlay

---

## Clases de componentes globales

Definidas en `index.css` vía `@layer components`:

| Clase | Descripción |
|---|---|
| `.btn-primary` | Botón principal con fondo amber gold |
| `.btn-ghost` | Botón con borde, fondo transparente |
| `.card` | Panel con fondo `bar-surface` y borde |
| `.nav-item` | Ítem de navegación del sidebar |
| `.nav-item.active` | Estado activo con borde izquierdo dorado |
| `.badge` | Etiqueta compacta |
| `.badge-success` | Badge verde |
| `.badge-error` | Badge rojo |
| `.badge-warning` | Badge amarillo |

---

## Cómo correr el frontend

### Desarrollo (sin Docker)

```bash
cd frontend
npm install
npm run dev
# → http://localhost:3000
# El proxy reenvía /api/* → http://localhost:8080
```

Requisitos: Node.js ≥ 18, el backend Go corriendo en :8080.

### Producción (Docker Compose)

```bash
# Desde la raíz del proyecto
docker compose up --build
# Frontend → http://localhost:3000
# API      → http://localhost:8080
```

El servicio `frontend` se construye en dos etapas:
1. **Build** (node:20-alpine): `npm ci && npm run build` → `/app/dist`
2. **Serve** (nginx:1.27-alpine): sirve `/dist` con SPA fallback y proxy a `api:8080`

### Scripts disponibles

| Script | Descripción |
|---|---|
| `npm run dev` | Dev server con HMR en :3000 |
| `npm run build` | Build de producción en `dist/` |
| `npm run preview` | Preview del build en :4173 |

---

## Validación de criterios de aceptación (DoD)

| Criterio | Estado | Evidencia |
|---|---|---|
| Proyecto base configurado (React + Vite + Tailwind) | ✅ | `package.json`, `vite.config.js`, `tailwind.config.js` |
| Interfaz en idioma inglés | ✅ | `lang="en"` en HTML; todos los textos en inglés |
| Diseño responsive (Desktop/Laptop) | ✅ | Sidebar con `md:translate-x-0`, hamburger con `md:hidden` |
| Paleta corporativa en hoja de estilos global | ✅ | CSS variables en `index.css`, tokens en `tailwind.config.js` |
| Compatible con Chrome — sin desbordamiento | ✅ | `overflow-x: hidden` en body; `dvh` para altura; clases Tailwind |
| Header con nombre del bar y botón Login | ✅ | `Header.jsx` — "Bar Inventory" + `<button>Login</button>` |
| Sidebar de navegación | ✅ | `Sidebar.jsx` con 6 ítems (vacíos hasta próximas HUs) |
| Área principal de contenido | ✅ | `<Outlet />` en `Layout.jsx`, `Dashboard.jsx` como landing |
| Hamburger que oculta sidebar en móvil | ✅ | `sidebarOpen` state, `-translate-x-full` / `translate-x-0` |

---

## Próximos pasos (HUs siguientes)

| Tarea | HU |
|---|---|
| Implementar formulario de Login real (JWT) | HU-Auth |
| Crear página Inventory con tabla y filtros | HU-Inventario |
| Crear página Orders con workflow de estado | HU-Pedidos |
| Crear página Users con CRUD | HU-Usuarios |
| Crear página Reports con gráficos | HU-Reportes |
| Agregar cliente HTTP (`fetch` wrapper o `axios`) | HU siguiente |
| Implementar manejo de estado global (`Context` o `Zustand`) | HU siguiente |
