import { existsSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import { defineConfig } from "prisma/config";  // no env import

// Load .env files locally (harmless on Vercel)
for (const file of [".env", ".env.local"]) {
  const full = path.join(process.cwd(), file);
  if (existsSync(full)) process.loadEnvFile(full);
}

// Engine binary fix (keep as-is)
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
    // ignore
  }
}

// Empty fallback lets `prisma generate` succeed without DATABASE_URL
const migrationUrl =
  process.env.DIRECT_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "";

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