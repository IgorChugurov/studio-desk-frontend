# studio-desk-frontend

Frontend of StudioDesk: one Next project for the platform admin, the studio admin, and the public site of a studio. Which part answers is chosen by the request host (`src/proxy.ts`). Only the platform admin exists so far, and it shows the version of the platform API.

## Run

Node 24 (`.nvmrc`) and pnpm.

```text
pnpm install
pnpm dev
```

Open `http://admin.localhost:3001`. The page shows the address of the API and the version it reports.

The API address is `NEXT_PUBLIC_API_URL` in `.env.development`. To work against another API (for example the server), put the line in `.env.local`, which is not committed, and restart `pnpm dev`. That API must allow your address in CORS (`CORS_EXTRA_ORIGINS` in the backend settings).

Settings are described in `.env.example`.

## Commands

| Command                             | What it does                                          |
| ----------------------------------- | ----------------------------------------------------- |
| `pnpm dev`                          | development server on port 3001                       |
| `pnpm build` / `pnpm start`         | production build and start                            |
| `pnpm typecheck`                    | TypeScript check                                      |
| `pnpm lint`                         | oxlint, including the ban on imports between surfaces |
| `pnpm format` / `pnpm format:check` | Prettier                                              |
| `pnpm test`                         | Vitest                                                |

## Structure

```text
src/proxy.ts       chooses the surface by host
src/app/platform/  pages of the platform admin
src/platform/      code of the platform admin only
src/studio/        code of the studio admin only (not built yet)
src/site/          code of the public site only (not built yet)
src/shared/        code used by more than one surface
```

A surface imports only from `shared/` and from itself; `pnpm lint` enforces it.
