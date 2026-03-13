# Frontend Scraping OTAs

Interfaz web para visualizar datos de scraping de OTAs (Online Travel Agencies). Construida con React, TypeScript, Vite y TailwindCSS.

## Requisitos previos

- [Node.js](https://nodejs.org/) v18 o superior
- npm v9 o superior (incluido con Node.js)
- El backend de la API corriendo localmente (por defecto en `http://localhost:8001`)

## Instalación

1. **Clona el repositorio:**

   ```bash
   git clone https://github.com/MartiMussons/frontend-scraping-otas.git
   cd frontend-scraping-otas
   ```

2. **Instala las dependencias:**

   ```bash
   npm install
   ```

3. **Configura las variables de entorno:**

   Copia el archivo de ejemplo y edítalo con tus valores:

   ```bash
   cp .env.example .env
   ```

   Abre `.env` y ajusta la URL de la API si es necesario:

   ```env
   VITE_API_BASE_URL=http://localhost:8001/api/v1
   ```

   > **Nota:** El archivo `.env` nunca se sube al repositorio. Cada desarrollador debe crearlo localmente a partir de `.env.example`.

## Ejecución en desarrollo

```bash
npm run dev
```

La app estará disponible en [http://localhost:5173](http://localhost:5173).

## Scripts disponibles

| Comando | Descripción |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo con hot-reload |
| `npm run build` | Compila TypeScript y genera el bundle de producción en `/dist` |
| `npm run preview` | Previsualiza el build de producción localmente |
| `npm run typecheck` | Verifica los tipos de TypeScript sin compilar |

## Stack tecnológico

- **React 19** — librería de UI
- **TypeScript** — tipado estático
- **Vite** — bundler y servidor de desarrollo
- **TailwindCSS** — estilos utilitarios
- **TanStack Query (React Query)** — gestión de estado del servidor y caché
- **React Router v7** — enrutado del cliente
- **Recharts** — gráficas y visualizaciones
- **date-fns** — utilidades de fechas

## Estructura del proyecto

```
src/
├── api/              # Funciones de llamada a la API
├── components/       # Componentes reutilizables
├── features/         # Módulos por funcionalidad (dashboard, tours…)
├── pages/            # Páginas de la aplicación
├── types/            # Tipos TypeScript compartidos
└── utils/            # Funciones de utilidad
```
