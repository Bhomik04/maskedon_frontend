# maskedon Frontend

React + TypeScript client for maskedon.

## Stack

- React 19
- TypeScript 5
- Vite 7
- TailwindCSS 4
- React Router 7
- Axios

## Structure

- `src/pages/` - Route-level pages
- `src/components/` - Reusable UI components
- `src/context/` - Auth state and session bootstrapping
- `src/lib/` - API client and shared frontend helpers
- `src/types/` - Shared TypeScript interfaces used across pages/components

## Runtime behavior

- Base API URL defaults to `/api/v1`, or can be overridden with `VITE_API_BASE_URL`.
- Access token is attached to requests from `localStorage`.
- 401 responses trigger refresh-token rotation through `/auth/refresh`.
- Vite dev server proxies `/api/*` to backend `http://localhost:5000`.
- WebSocket URL defaults to `ws://localhost:5000` in local development, or can be set with `VITE_WS_URL`.

## Scripts

- `npm run dev` - Start Vite dev server
- `npm run build` - Type-check and build production bundle
- `npm run lint` - Run ESLint
- `npm run preview` - Preview production build

## Local setup

1. Install dependencies:
   - `npm install`
2. Start backend in `../backend`.
3. Start frontend:
   - `npm run dev`
4. Open `http://localhost:5173`.

## Netlify deploy

1. Push the repository to GitHub.
2. In Netlify, create a new site from that repo and set:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `dist`
3. Add frontend environment variables in Netlify site settings:
   - `VITE_API_BASE_URL=https://<your-backend-domain>/api/v1`
   - `VITE_WS_URL=wss://<your-backend-domain>`
4. Ensure backend CORS allows your Netlify domain via `FRONTEND_URL`.
5. Deploy. SPA routing is handled by `netlify.toml`.
