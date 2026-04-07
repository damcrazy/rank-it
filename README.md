# rank-it

Community ranking boards for food, places, trips, neighborhoods, and whatever else people feel like arguing about.

This repo is the web app for `rank-it`: a pale-paper, poster-style ranking product where people create boards, add picks, vote on existing entries, and push the leaderboard around in real time.

## What This Thing Does

- create public ranking boards
- add entries or vote on an existing match
- search boards by title, description, category, or location
- attach optional board-level map locations
- attach optional item-level place picks
- open a detail sheet for leaderboard entries
- prevent spammy repeat votes with auth, rate limiting, and submission fingerprints

## Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Bun`
- `Turborepo`
- `Supabase`
- `shadcn/ui`
- `Leaflet + react-leaflet`

## Repo Shape

```text
apps/web        -> main Next.js app
packages/ui     -> shared UI components + global styles
supabase        -> SQL migrations and database shape
```

## Run It

Install:

```bash
bun install
```

Start the whole monorepo:

```bash
bun run dev
```

Or run just the web app:

```bash
bun run --cwd apps/web dev
```

## Useful Commands

Typecheck:

```bash
bun run typecheck
```

Lint:

```bash
bun run lint
```

Format app files:

```bash
bun run --cwd apps/web format
```

Push Supabase migrations:

```bash
supabase db push
```

## Database Notes

The schema lives in [supabase/migrations/001_init.sql](/Users/apple/Documents/GitHub/rank-it/rank-it-web/supabase/migrations/001_init.sql) plus follow-up migrations.

Current app behavior expects:

- `boards` to store title, category, description, location, and board coordinates
- `items` to store name, vote count, optional description, and optional picked location
- `submissions` to store one vote per user/item plus anti-abuse signals

Recent item location support is added in [003_item_location_fields.sql](/Users/apple/Documents/GitHub/rank-it/rank-it-web/supabase/migrations/003_item_location_fields.sql).

## UI Notes

The UI is intentionally not a default SaaS dashboard.

It uses:

- pale paper backgrounds
- strong black borders
- loud accent blocks
- sharp corners almost everywhere
- comic-ish CTA styling
- cleaner hidden-detail patterns for the leaderboard

If you are changing the design system, most of the shared primitives live in [packages/ui/src/components](/Users/apple/Documents/GitHub/rank-it/rank-it-web/packages/ui/src/components) and the global theme lives in [globals.css](/Users/apple/Documents/GitHub/rank-it/rank-it-web/packages/ui/src/styles/globals.css).

## Product Flow

1. Someone creates a board.
2. Other people add picks or vote on existing entries.
3. The leaderboard reorders by vote count.
4. Optional location data helps people discover boards and specific entries.
5. The side sheet gives extra context without cluttering the main ranking view.

## A Few Ground Rules

- keep the main ranking interaction fast
- hide extra detail until it earns space
- do not let the UI drift back into generic dark-card dashboard land
- if a component gets noisy, simplify it
- if a page looks like a starter template, it probably is not done

## Importing UI Components

Shared UI components come from the workspace package:

```tsx
import { Button } from "@workspace/ui/components/button"
```

## Final Pitch

This app is basically:

people making lists,
the crowd causing trouble,
and the leaderboard deciding who wins.
