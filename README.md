# Vehicle Tracker

Fleet GPS tracking: live map, trip history, geofencing and alerts.

Built on Next.js 16 (App Router), Prisma 7 + PostgreSQL, NextAuth v5 and
shadcn/ui. The Next.js app is the dashboard and REST API; the TCP ingestion
server, processing workers and realtime fan-out are separate services added in
later phases.

## Status

| Phase | Scope | State |
| --- | --- | --- |
| 0 | Project setup, database | Done |
| 1 | Database schema, auth, RBAC, multi-tenancy | Done |
| 2 | Dashboard pages (map, fleet, trips, alerts, reports, settings) | Done |
| 3 | TCP ingestion server (Teltonika Codec 8) | Not started |
| 4 | Processing workers (trip detection, geofence evaluation) | Not started |
| 5 | REST API routes and realtime fan-out | Not started |

Every page listed in the sidebar is built and reads live data. What is not yet
built is the pipeline that *produces* that data from real hardware - until
phase 3 lands, positions, trips and alerts come from `prisma/seed.ts`.

## Prerequisites

- Node.js 20+

**Docker is not required and not used.** The database is a hosted
[Neon](https://neon.tech) serverless Postgres, configured in `.env.local`.
Nothing runs locally but the Next.js dev server.

## Getting started

```bash
npm install
npm run db:deploy    # apply migrations to Neon
npm run db:seed      # 30 days of demo fleet history
npm run dev
```

Open http://localhost:3000.

The seed creates `owner@demo.test`, `admin@demo.test`, `manager@demo.test` and
`viewer@demo.test`, all with the password `Password123!`. Sign in as different
roles to see the sidebar and the available actions change — a viewer gets a
real 403 on `/settings`, not a hidden link.

It also generates six vehicles with paired trackers, four drivers, four
geofences, ~11,000 position fixes, ~270 trips, ~470 alerts and a maintenance
schedule, so every page has something real to render.

## Pages

| Route | What it does |
| --- | --- |
| `/dashboard` | Fleet counters, recent alerts, 14-day distance trend |
| `/map` | Live positions on Leaflet, geofence overlays, 30s auto-refresh |
| `/vehicles` | Fleet table; `/vehicles/[id]` adds recent track, trips, maintenance |
| `/trips` | Filterable, paginated trip log; `/trips/[id]` draws the route |
| `/geofences` | Circular zones with a map preview in the editor |
| `/alerts` | Filterable alert log, acknowledge flow, alert-rule toggles |
| `/drivers` | Driver records with licence-expiry flagging |
| `/maintenance` | Scheduled jobs with overdue detection by date or odometer |
| `/reports` | Distance per day and per vehicle, alerts by type, 7/30/90 day |
| `/settings` | Organization, members and roles, tracking devices |

## Layout

```
app/
  (auth)/          login, register, and their server actions
  (dashboard)/     authenticated shell, pages, and actions.ts (all mutations)
  api/auth/        NextAuth route handler
components/
  dashboard/       sidebar, nav, page chrome, form controls, status badges
  map/             Leaflet canvas and its client-only wrapper
  ui/              shadcn components
lib/
  dal.ts           Data Access Layer - the authorization boundary
  rbac.ts          roles, permissions
  format.ts        display helpers (distance, duration, dates, money)
  prisma.ts        Prisma client singleton
  validations/     zod schemas for every form
  generated/       generated Prisma client (gitignored)
prisma/
  schema.prisma    data model
  seed.ts          development seed
scripts/
  prisma-retry.mjs retries Prisma CLI commands through transient P1001s
proxy.ts           optimistic route protection
```

## Authorization

Two layers, deliberately:

1. **`proxy.ts`** runs on every request, reads only the session cookie, and
   redirects signed-out visitors to `/login`. No database access - it runs on
   prefetches too. This is a convenience, not a security boundary.
2. **`lib/dal.ts`** is the real boundary. Every read goes through a helper that
   calls `verifySession()` and filters by the session's `orgId`, so one tenant
   cannot read another's rows. Role checks use `requirePermission()`, which
   raises a 403 through `forbidden()`.

Mutations in `app/(dashboard)/actions.ts` follow the same rule: each re-derives
`orgId` from the session and puts it in the `where` of the update or delete, so
a row id posted by hand is never enough to reach another tenant's data.

The sidebar hides links the role lacks, but hiding a link is not access control
- the DAL still refuses the data.

## Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |
| `npm run db:generate` | Regenerate the Prisma client |
| `npm run db:migrate` | Create and apply a migration (with retries) |
| `npm run db:deploy` | Apply existing migrations (with retries) |
| `npm run db:status` | Migration status (with retries) |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Prisma Studio |
| `npm run db:up:docker` / `db:down:docker` | Optional local Postgres, if Docker works |

## Notes and known constraints

- **Two database URLs.** `DATABASE_URL` is Neon's pooled `-pooler` host and is
  what the app uses at runtime. `DIRECT_DATABASE_URL` is the direct host and is
  used only by `prisma migrate`, because PgBouncer cannot hold the session-level
  advisory lock or the multi-statement DDL transaction a migration needs. Both
  carry `connect_timeout=60`: a Neon compute that has scaled to zero takes
  several seconds to wake, and Prisma's 5s default aborts before it answers.
- **`npm run db:*` wrap the Prisma CLI in a retry loop.** See Troubleshooting -
  P1001 is transient here and does not mean the database is down.
- **The `prisma-client` generator, not `prisma-client-js`.** The app imports
  `@/lib/generated/prisma/client` and `/enums`, which only the newer generator
  emits. If those imports ever fail to resolve, the generator provider in
  `schema.prisma` has been reverted.
- **No TimescaleDB.** The `positions` table is a plain indexed table with a
  descending `(vehicleId, ts)` index. If write volume ever needs it, switch to
  native PostgreSQL partitioning rather than an extension Neon may not carry.
- **Prisma 7, not 8.** npm's `latest` tag for `prisma` is the 8.0 release
  candidate, whose CLI is a rewrite. This project pins the stable 7.10.0 CLI to
  match `@prisma/client@7.10.0`. `npm update` will try to pull 8 in - don't.
- **`forbidden()` is experimental** and needs `experimental.authInterrupts`,
  which is set in `next.config.ts`.
- **shadcn "base-nova" style uses Base UI, not Radix**, for several primitives.
  Composition is `render={<Link />}`, not `asChild`. Form controls in
  `components/dashboard/form-fields.tsx` are deliberately native elements, so
  server actions always find their values in `FormData`.
- **Timestamps render in fixed `en-GB`/UTC** via `lib/format.ts`. Formatting a
  server-rendered date with the machine's locale hydrates to different text in
  the browser, which React reports as a hydration mismatch.

## Troubleshooting

**`P1001: Can't reach database server`.** On this machine the message is almost
always wrong. Two separate causes, both handled in `prisma.config.ts`:

1. The Prisma CLI's engine resolver does not find the `schema-engine-windows.exe`
   that ships inside `@prisma/engines`, and tries to download a replacement;
   when that download is blocked it reports P1001. The config sets
   `PRISMA_SCHEMA_ENGINE_BINARY` to the local binary.
2. Even with the right binary, the Rust engine's TLS connection to Neon
   succeeds only intermittently — roughly one attempt in three. The `pg` driver
   adapter the app itself uses connects reliably every time, so **only CLI
   commands are affected**.

So: use `npm run db:migrate` / `db:deploy` / `db:status` rather than calling
`npx prisma` directly, and let `scripts/prisma-retry.mjs` retry. To confirm the
database really is reachable before digging further, connect with `pg` directly
— if that works, the database is fine.

**`The datasource property 'url' is no longer supported in schema files`.**
Prisma 7 moved connection URLs out of `schema.prisma`. The `datasource db` block
holds only `provider`; the URL lives in `prisma.config.ts` for the CLI and in
`lib/prisma.ts` (as the `PrismaPg` adapter) for the app.
