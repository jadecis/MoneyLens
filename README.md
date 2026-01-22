# MoneyLens

This project now uses Node.js with Vue 3 + Vite.

## Development
- Install dependencies: `npm install`
- Start API (file-based auth): `npm run api`
- Start dev server: `npm run dev`
- Start both API + dev server together: `npm run dev:full`
- Build for production: `npm run build`
- Preview built app: `npm run preview`

Auth API stores users under `users/<login>.json` (lowercased login). Register/login via `/api/register` and `/api/login`.

