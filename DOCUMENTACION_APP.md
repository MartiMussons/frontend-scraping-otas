# Documentacion de la aplicacion

## 1. Resumen

`frontend-scraping-otas` es una aplicacion web para analizar precios y disponibilidad de tours en OTAs (por ejemplo, GetYourGuide y Viator), comparando datos por horizonte temporal, proveedor y opcion de tour.

La app consume una API REST (backend separado) y muestra:

- KPIs de precio y disponibilidad
- Evolucion de precios por OTA
- Tablas comparativas por opcion
- Calendario/heatmap de disponibilidad
- Vista de detalle diaria de disponibilidad
- Snapshot de listados de Viator

## 2. Stack tecnologico

- React 19
- TypeScript
- Vite
- TailwindCSS
- TanStack Query (React Query)
- React Router v7
- Recharts
- date-fns

## 3. Arquitectura de alto nivel

## Frontend

- `src/main.tsx`: inicializa providers globales
- `src/App.tsx`: define rutas principales
- `src/pages/`: paginas de la aplicacion
- `src/features/`: logica por dominio (dashboard, tours)
- `src/api/`: cliente HTTP y funciones de acceso a endpoints
- `src/types/`: tipos de respuesta de la API

## Providers globales

En `src/main.tsx` la app monta:

- `ErrorBoundary` para fallos no controlados
- `BrowserRouter` para routing
- `QueryClientProvider` para cache y fetch de datos
- `TourSelectionProvider` para tour seleccionado
- `HorizonSelectionProvider` para horizonte seleccionado

## Configuracion de React Query

QueryClient configurado con:

- `retry: 2`
- `refetchOnWindowFocus: false`

Adicionalmente, cada query define `staleTime`, `gcTime` y en varios casos `refetchInterval`.

## 4. Rutas de la aplicacion

Definidas en `src/App.tsx`:

- `/` -> `DashboardPage`
- `/availability` -> `AvailabilityDetailPage`

## 5. Flujo funcional

## Dashboard (`/`)

`DashboardPage` permite:

- Seleccionar tour
- Seleccionar horizonte (`0`, `7`, `30`, `90`, `180` dias)
- Filtrar por OTA(s)
- Ver resumen de metricas (precio medio, disponibilidad, listings)
- Ver grafico de evolucion de precios
- Ver comparativa de opciones con disponibilidad y popularidad
- Navegar a detalle de disponibilidad
- Ver panel de listados de Viator

Consultas principales usadas:

- `useToursQuery`
- `useSourcesQuery`
- `useLatestPricesQuery`
- `useLatestAvailabilityQuery`
- `usePriceTimeseriesQuery`
- `useViatorListingQuery`

## Detalle de disponibilidad (`/availability`)

`AvailabilityDetailPage` permite:

- Cargar un rango de fechas (`from_date`, `to_date`)
- Filtrar por OTA
- Filtrar por texto de opcion/tour
- Ver heatmap de disponibilidad por dia
- Seleccionar un dia y ver slots detallados (`day-detail`)

Tambien acepta parametros por URL, por ejemplo:

- `tour_code`
- `ota_name`
- `option_name`
- `from_date`
- `to_date`
- `target_date`

Consultas principales usadas:

- `useAvailabilityHeatmapQuery`
- `useAvailabilityDayDetailQuery`
- `useLatestAvailabilityQuery` (fallback para enriquecer calculos)

## 6. Configuracion de OTAs

En `src/features/dashboard/constants.ts` se define:

- `OTA_CONFIG` (label y color por OTA)
- `KNOWN_OTA_NAMES` (orden base de OTAs)
- Helpers `otaLabel` y `otaColor`

Para registrar una nueva OTA en el dashboard:

1. Anadir clave en `OTA_CONFIG`.
2. Verificar que el backend devuelve `ota_name` coherente con esa clave.
3. Confirmar visualmente filtros, badges y series.

## 7. API consumida por el frontend

Base URL en `VITE_API_BASE_URL`.

Funciones en `src/api/market.ts`:

- `GET /tours`
- `GET /sources?tour_code=...`
- `GET /prices/latest?tour_code=...&horizon_days|range_days&ota_name&limit`
- `GET /availability/latest?tour_code=...&horizon_days|range_days&ota_name&limit`
- `GET /prices/timeseries?tour_code=...&horizon_days&from_date&to_date&limit`
- `GET /availability/heatmap?tour_code=...&ota_name&range_days&from_date&to_date`
- `GET /availability/day-detail?tour_code=...&target_date=...&ota_name`
- `GET /viator/listing`

Si la API no responde con `2xx`, `apiFetch` lanza error con codigo HTTP y etiqueta contextual.

## 8. Variables de entorno

Archivo requerido: `.env`

Variable minima:

```env
VITE_API_BASE_URL=http://localhost:8001/api/v1
```

Referencia incluida en el repo: `.env.example`.

## 9. Instalacion y arranque

## Requisitos

- Node.js 18+
- npm 9+
- Backend de API levantado

## Pasos

1. Clonar repo:

```bash
git clone https://github.com/MartiMussons/frontend-scraping-otas.git
cd frontend-scraping-otas
```

2. Instalar dependencias:

```bash
npm install
```

3. Crear `.env` desde ejemplo:

Linux/macOS:

```bash
cp .env.example .env
```

Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

4. Ajustar `VITE_API_BASE_URL` en `.env`.

5. Ejecutar en desarrollo:

```bash
npm run dev
```

6. Abrir app en `http://localhost:5173`.

## 10. Scripts

- `npm run dev`: servidor local con hot reload
- `npm run build`: type-check + build de produccion
- `npm run preview`: sirve build generado en `dist`
- `npm run typecheck`: validacion de tipos sin generar build

## 11. Build y despliegue

Build de produccion:

```bash
npm run build
```

Salida en carpeta `dist/`.

Previsualizar build:

```bash
npm run preview
```

Para desplegar en cualquier hosting estatico, publicar el contenido de `dist/` y configurar correctamente la variable `VITE_API_BASE_URL` en entorno de build.

## 12. Troubleshooting rapido

## Error: Missing VITE_API_BASE_URL

- Verifica que existe `.env` en la raiz
- Verifica nombre exacto: `VITE_API_BASE_URL`
- Reinicia `npm run dev` tras editar variables

## Pantallas vacias o errores de fetch

- Confirmar backend levantado
- Confirmar URL correcta en `.env`
- Revisar consola de navegador y Network

## Datos inconsistentes al cambiar filtros

- React Query usa cache temporal por `queryKey`
- Puedes forzar refresco con botones de retry donde aplique

## 13. Convenciones utiles para desarrollo

- Tipos de API centralizados en `src/types/market.ts`
- Acceso HTTP centralizado en `src/api/client.ts`
- Query keys separadas por dominio (`features/*/queryKeys.ts`)
- Contextos para estado global de seleccion (`tour`, `horizon`)

## 14. Mejoras sugeridas a futuro

- Anadir tests unitarios para utilidades y hooks
- Anadir tests de integracion para paginas clave
- Definir estrategia de autenticacion/autorizacion si la API lo requiere
- Documentar contrato de datos entre backend y frontend con ejemplos JSON
