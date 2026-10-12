# PROFILE SYNC — MILESTONE 2 HANDOFF (temporary file, delete after use)

Goal: desktop UI for syncing profiles between users. Owner publishes a profile,
friends subscribe via a join code and receive updates (one-way, owner-authoritative).

## What already exists (Milestone 1, branch `feature/sync`, uncommitted)

Backend is done and fully smoke-tested:

- **Tables** (`packages/database/src/schema/profile-sync.ts`): `profile_sync`
  (owner_hardware_id, join_code unique, name, latest_revision counter,
  current_profile JSON, timestamps) + `profile_sync_member` (sync_id FK cascade,
  hardware_id, unique(sync_id, hardware_id)). Migration `0057_grey_the_hunter.sql`.
- **Repo** (`packages/database/src/repositories/profile-sync.repository.ts`):
  findById, findByJoinCode, findByOwner, create, pushRevision (overwrites
  payload + bumps revision — no history), addMember, countMembers, isMember.
- **Routes** (`apps/api/src/routers/v2/profile-sync.ts`, registered in `v2/index.ts`):
  - `POST /api/v2/profile-sync` → create, auto-adds owner as member → `{id, joinCode, latestRevision}`
  - `POST /api/v2/profile-sync/{id}/join` body `{joinCode, hardwareId}` → `{id, status: "joined"|"already-member"}`; 403 when full
  - `GET /api/v2/profile-sync/{id}` → `{id, name, latestRevision, updatedAt, profile}`
  - `PUT /api/v2/profile-sync/{id}` body `{id, hardwareId, profile}` → owner-only, → `{latestRevision}`
- **Caps**: max 200 mods/sync, 50 members/sync (owner counts), hardwareId ≤128,
  join codes are 8 chars from `JOIN_CODE_ALPHABET` in `apps/api/src/lib/join-code.ts`.
- **Validation**: `apps/api/src/validation/profile-sync.ts`. Payload reuses
  `profileSchema` from `@deadlock-mods/shared` (v1/v2/v3 union) — byte-compatible
  with the existing profile-share feature.

## What Milestone 2 must build (desktop app, `apps/desktop`)

1. **Store the link**: when a profile joins a sync, persist `{syncId, joinCode,
   lastSeenRevision}` keyed to the local profile in the persisted store
   (`@/lib/store`, same place profile metadata lives today).
2. **Create UI**: "Sync with friends" action next to the existing share entry —
   copy `ProfileShareDialog` (`src/components/profiles/profile-share-dialog.tsx`)
   as the pattern (dialog + react-query mutation, feature flag
   `useExperimentalFeature` — add a flag like `profile-sync` alongside
   `profile-sharing` in the flag definitions).
3. **Join UI**: input for the friend's join code → `joinSync` mutation →
   creates a new local profile via the existing import pipeline
   (`use-mod-interchange` / `types/mods.ts` ProfileImport*) → sets
   `{syncId, lastSeenRevision}` on it.
4. **Poll & apply**: react-query polling of `getSyncState` (pattern: the
   `is-game-running` query polls every 5s; use ~30-60s here + a manual refresh).
   If `latestRevision > lastSeenRevision` → apply payload through the import
   pipeline → update `lastSeenRevision`.
5. **Managed-profile rule**: the synced profile is owner-authoritative. Either
   block local edits to it or fork-on-edit into a normal profile — do NOT let
   edits sit and get silently clobbered by the next poll.
6. **i18n**: all user-facing strings via `react-i18next` keys in
   `apps/desktop/src/locales/en.json` (+ translations).
7. **Tests**: bun test conventions; if Tauri UI debugging is needed, use
   tauri-mcp-server and ask the user to start the dev server (never start it yourself).

## Design decisions already made (don't relitigate without the owner)

- One-way sync: only the owner pushes; friends receive. No merge.
- Owner's copy always wins (authoritative mirror), enforced client-side in M2.
- New profile per join; mods themselves are downloaded by the importing client
  from GameBanana (payload references remoteIds only — no mod files on the API).
- v1 identity is `hardwareId` (same trust level as profile sharing).
  Better Auth (`apps/auth`) is a later milestone, NOT M2.

## Environment gotchas (learned the hard way)

- Root `.env` has an invalid placeholder `SENTRY_DSN` — running `apps/api`
  locally needs an inline override:
  `SENTRY_DSN="https://68ca3d16310ec3b252293d44ecf5fe21@o84215.ingest.us.sentry.io/4508546052915200" PORT=9010 pnpm --filter @deadlock-mods/api dev`
- `apps/api` now honors `PORT` (was hardcoded to 9000 in `Bun.serve`, fixed in M1).
- A rootful podman compose stack runs on this machine (`deadlock_api` on 9000,
  postgres on 5435, redis 6379, `deadlock_mirror_service` on 3002 — stopped).
  Use `podman --url unix:///run/podman/podman.sock` for rootful access.
- Desktop with defaults talks to **production** (`api.deadlockmods.app`); to
  test against a local API set `VITE_API_URL` before launching desktop dev.
- `pnpm db:generate` needs a TTY when drizzle-kit wants to ask about renames —
  prefer regenerating from scratch on disposable tables.
