import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { defineConfig } from "prisma/config";

// Next.js reads `.env.local`, but the Prisma CLI only reads `.env`. Load it
// explicitly so `prisma migrate` and `next dev` always agree on the database.
for (const file of [".env", ".env.local"]) {
  const full = path.join(process.cwd(), file);
  if (existsSync(full)) process.loadEnvFile(full);
}

// On Windows the CLI's engine resolver misses the binary that ships inside
// `@prisma/engines` and tries to download a replacement instead; when that
// download is blocked the failure surfaces as a bogus "P1001: can't reach
// database server". Point the CLI straight at the binary we already have.
if (!process.env.PRISMA_SCHEMA_ENGINE_BINARY) {
  const require = createRequire(import.meta.url);
  try {
    const enginesDir = path.dirname(
      require.resolve("@prisma/engines/package.json"),
    );
    const binary = path.join(
      enginesDir,
      process.platform === "win32"
        ? "schema-engine-windows.exe"
        : "schema-engine",
    );
    if (existsSync(binary)) process.env.PRISMA_SCHEMA_ENGINE_BINARY = binary;
  } catch {
    // Not installed in this tree - let the CLI resolve the engine itself.
  }
}

// Migrations need a *direct* (non-pooled) connection: PgBouncer, which fronts
// Neon's `-pooler` host, cannot hold the session-level advisory lock or the
// multi-statement DDL transaction that `prisma migrate` runs. The app itself
// keeps using the pooled URL - see lib/prisma.ts.
const migrationUrl = process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL;

if (!migrationUrl) {
  throw new Error(
    "Neither DIRECT_DATABASE_URL nor DATABASE_URL is set. Copy .env.example to .env.local first.",
  );
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    url: migrationUrl,
  },
});
