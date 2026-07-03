# Immich Fork Agent Instructions

This checkout is a fork of Immich used as the thin web-shell layer for Playa Lens. Keep the fork small and easy to rebase.

## Project Role

- Upstream Immich owns photo management: timeline, asset viewer, albums, upload, OCR, faces, CLIP, mobile backup, and Immich auth.
- Playa Lens planner data lives in the sibling repo at `../playa-lens`, under `catalog-api` and `/social/*`.
- Do not move social-planning state, workflow, calendar, comments, publishing payloads, or catalog facts into Immich's database.
- Prefer native Immich entry points that hand off to same-origin Playa Lens routes.

## Fork Boundaries

- Keep Playa Lens customizations localized and plainly named, e.g. `playa-lens-*`.
- Prefer small additions to existing Immich components over broad rewrites.
- Do not refactor upstream Immich code unless the refactor is required for the Playa Lens change.
- Preserve upstream patterns so future Immich version rebases stay manageable.
- Do not modify generated SDK/OpenAPI/i18n artifacts unless the task explicitly requires it.

## Social Planner Integration

- `/social/*`, `/static/*`, and `/thumb/*` are served by the Playa Lens edge proxy, not by SvelteKit.
- Links to `/social/*` must force full-page navigation. Use `data-sveltekit-reload` on anchors or `globalThis.location.assign(...)` for imperative navigation.
- Fetch social API routes with `credentials: 'same-origin'`.
- Handle `401` as an Immich session/auth problem and surface errors through Immich's existing toast patterns.
- For asset actions, prefer reading `/social/api/assets/{asset_id}/context` before blindly creating inbox records.

## Development

- Package manager: `pnpm`.
- Primary local runtime for this fork is launched from `../playa-lens` with `make dev`, which builds this fork and runs the native proxy config.
- Use `make dev-upstream` from `../playa-lens` only when testing the official Immich image plus overlay fallback.
- The repo's own Makefile remains useful for upstream Immich development, but Playa Lens integration smoke tests should run through `../playa-lens`.

## Verification

For web-shell changes, run focused checks from this repo:

```bash
pnpm --dir web exec prettier --check <changed-file>
pnpm --dir web exec eslint <changed-file> --max-warnings 0
pnpm --dir web run check:typescript
pnpm --dir web run check:svelte
```

For a full local integration check, run from `../playa-lens`:

```bash
make dev
```

Then smoke the logged-in browser flow: sidebar `Social` link, asset-viewer social action, `/social/*` navigation, and absence of overlay injection in fork mode.

## Git

- Default work for Playa Lens integration happens on `playa-lens/v3.0.0-social-shell` unless the user asks otherwise.
- Do not add `Co-Authored-By` lines.
- Be careful in dirty worktrees. Do not revert user or upstream changes you did not make.
