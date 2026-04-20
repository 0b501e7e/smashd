# Smash'd

Monorepo for the Smash'd ordering platform.

Projects:

- `backend`: Express + Prisma + PostgreSQL
- `frontend`: Next.js web app
- `app`: Expo React Native app

## Local Development

The canonical local setup is:

- local PostgreSQL in Docker
- local backend on `http://localhost:5001`
- local frontend on `http://localhost:3000`
- mobile app configured explicitly to use either local or hosted backend

From repo root:

```bash
npm run dev:db
npm run dev:backend
npm run dev:web
npm run dev:app
```

If you want the backend to start Docker Postgres for you:

```bash
npm run dev:backend:db
```

## Environment

Use [docs/environment.md](/Users/senan/smashd/docs/environment.md) as the source of truth.

Templates:

- [backend/.env.example](/Users/senan/smashd/backend/.env.example)
- [frontend/.env.example](/Users/senan/smashd/frontend/.env.example)
- [app/.env.example](/Users/senan/smashd/app/.env.example)

## Notes

- Local Docker Postgres is supported and is the intended backend dev database.
- The old root README referenced a `Procfile` workflow that does not exist anymore.
- Production URLs and secrets should be injected via environment, not committed defaults.
