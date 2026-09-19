import "dotenv/config";
import { defineConfig, env } from "prisma/config";

// Prisma 7 CLI config. The CLI no longer loads .env or reads `url` from
// schema.prisma, so both happen here. The runtime client gets its URL via the
// pg adapter in lib/db.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: env("DATABASE_URL"),
  },
});
