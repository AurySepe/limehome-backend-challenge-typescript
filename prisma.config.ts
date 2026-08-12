import { defineConfig } from "prisma/config";

// Prisma skips .env loading when prisma.config.ts is present; load it manually.
// process.loadEnvFile() is built into Node.js 20+ — no extra dependencies needed.
// The try/catch handles environments where .env doesn't exist (e.g. Docker, CI).
try { process.loadEnvFile(); } catch {}

export default defineConfig({
  schema: "src/prisma/schema.prisma",
  migrations: {
    path: "src/prisma/migrations",
  },
});
