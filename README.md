# studio-desk-frontend

Frontend of StudioDesk: one Next project. The request host (`src/proxy.ts`) chooses the platform admin or the organization admin. The public site has no `src/site/` directory.

If this file disagrees with `studio-desk-docs`, the canon wins. Workspace rules: `studio-desk-docs/.cursor/rules/00-workspace-core.mdc`.

## Run

Node 24 (`.nvmrc`) and pnpm.

```text
pnpm install
pnpm dev
```

The local platform admin is `http://localhost:3001`. The host comes from `ADMIN_HOST` in `.env.development`. Another host, including `http://admin.localhost:3001`, answers Not found.

The studio admin host is `http://app.localhost:3001`. On the server the same application answers `https://app.studio-desk.axondigital.xyz` when that host reaches it.

The platform API address is `NEXT_PUBLIC_API_URL` in `.env.development` (`http://localhost:3000/api/platform`). The organization API is `/api/organization` (`src/shared/config/public-env.ts`). The backend is started separately; see the `studio-desk-backend` README. To work against another API (for example the server), put the line in `.env.local`, which is not committed, and restart `pnpm dev`. That API must allow your address in CORS (`CORS_EXTRA_ORIGINS` in the backend settings).

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
src/studio/        code of the organization admin (host app.localhost)
src/shared/        code used by more than one surface
```

A surface imports only from `shared/` and from itself; `pnpm lint` enforces it.
