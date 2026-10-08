# StudioDesk frontend

Brief of the current surface: `studio-desk-docs/01-product/platform-admin/frontend-brief.md`.
Canon of the API: `studio-desk-docs/03-architecture/`.
Topic: `studio-desk-docs/01-product/platform-admin/`.
Structure and commands: `README.md`.

## Before a commit

CI on every push runs `pnpm lint` and `pnpm format:check` before `pnpm test`. If either fails, the job stops and the server is not updated. `pnpm test` alone does not catch them. Run both, and fix what they print, before committing.

On 2026-10-08 two pushes failed this way:

- `pnpm lint` (`oxlint --type-aware`) failed on `String(response.body)` in a test. `body` is not always a string; `String` on an object becomes `[object Object]`. Read it only when it is a string.
- The same lint failed on `setState` called directly inside `useEffect` (`react(set-state-in-effect)`). That starts another render from the effect. Set state from the finished request, or defer it. Do not call it synchronously in the effect.
- `pnpm format:check` then failed because three new test files were not formatted. Run `pnpm exec prettier --write` on files you added or edited.

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
