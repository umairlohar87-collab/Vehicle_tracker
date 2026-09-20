import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required by `forbidden()` / `unauthorized()`, which lib/dal.ts uses to turn
  // a failed RBAC check into a real 403 instead of a redirect.
  experimental: {
    authInterrupts: true,
  },
  // The Prisma client is generated TypeScript that must not be bundled for the
  // browser or traced as a serverless dependency twice.
  serverExternalPackages: ["@prisma/adapter-pg"],
};

export default nextConfig;
