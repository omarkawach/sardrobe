# `@sardrobe/data-ops`

Shared D1, auth, and wardrobe schema wiring for Sardrobe.

## What lives here

- Better Auth configuration for Google sign-in
- Drizzle schema for Better Auth tables
- Drizzle schema for wardrobe items, item media, outfits, and outfit membership
- D1 database initialization helpers for Workers
- Drizzle admin config for local migration and inspection commands

## Local setup

1. Run `pnpm --filter @sardrobe/data-ops better-auth-generate` if auth config changes.
2. Run `pnpm --filter @sardrobe/data-ops generate` to create Drizzle SQL output for D1.
3. Apply the generated SQL to the backend's local D1 database:
   - `pnpm --filter @sardrobe/data-ops db:migrate:local`

The standard local and remote migration commands use the D1 binding in the backend Wrangler config. The account-scoped values in [`.env.example`](./.env.example) are only needed for direct Drizzle Kit administration.

## Current schema

- `user`
- `session`
- `account`
- `verification`

- `wardrobe_items`
- `wardrobe_item_media`
- `outfits`
- `outfit_items`
- `packing_plans`
- `packing_plan_outfits`
- `packing_plan_items`

The auth tables are managed by Better Auth. All wardrobe, outfit, and packing
tables are user-owned application data.
