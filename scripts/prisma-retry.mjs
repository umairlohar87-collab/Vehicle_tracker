#!/usr/bin/env node
/**
 * Runs a Prisma CLI command, retrying when it fails with P1001.
 *
 * Prisma's Rust schema engine connects to Neon over TLS only intermittently on
 * some networks - roughly one attempt in three succeeds, while the `pg` driver
 * adapter the app itself uses connects every time. That makes P1001 a transient
 * failure for CLI commands specifically, not a sign the database is unreachable.
 *
 *   node scripts/prisma-retry.mjs migrate deploy
 *
 * Anything that is not P1001 fails immediately - a real schema or data error
 * should not be retried six times before it is reported.
 */
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const PRISMA_BIN = path.join(
  path.dirname(require.resolve("prisma/package.json")),
  require("prisma/package.json").bin.prisma,
);

const MAX_ATTEMPTS = 8;
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error("usage: node scripts/prisma-retry.mjs <prisma args...>");
  process.exit(2);
}

/** Resolves to { code, sawP1001 }, streaming output as it arrives. */
function runOnce() {
  return new Promise((resolve) => {
    // The CLI's own entrypoint under this Node, rather than `npx` through a
    // shell: Windows will not spawn a `.cmd` without `shell: true`, and Node
    // deprecates that because it concatenates args unescaped.
    const child = spawn(process.execPath, [PRISMA_BIN, ...args], {
      stdio: ["inherit", "pipe", "pipe"],
    });

    let sawP1001 = false;

    const watch = (stream, sink) => {
      stream.on("data", (chunk) => {
        const text = chunk.toString();
        if (text.includes("P1001")) sawP1001 = true;
        sink.write(text);
      });
    };

    watch(child.stdout, process.stdout);
    watch(child.stderr, process.stderr);

    child.on("close", (code) => resolve({ code: code ?? 1, sawP1001 }));
  });
}

for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
  const { code, sawP1001 } = await runOnce();

  if (code === 0) {
    if (attempt > 1) console.log(`\n✔ Succeeded on attempt ${attempt}.`);
    process.exit(0);
  }

  if (!sawP1001) {
    console.error(`\n✖ prisma ${args.join(" ")} failed (exit ${code}).`);
    process.exit(code);
  }

  if (attempt < MAX_ATTEMPTS) {
    console.warn(
      `\n… P1001 on attempt ${attempt}/${MAX_ATTEMPTS}; the schema engine's connection to Neon is flaky. Retrying.\n`,
    );
  }
}

console.error(
  `\n✖ Still failing with P1001 after ${MAX_ATTEMPTS} attempts. Check that DIRECT_DATABASE_URL is right and that the Neon project is not suspended.`,
);
process.exit(1);
