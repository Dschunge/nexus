/**
 * Prisma config for the RUNTIME image, used by `prisma db push` on startup.
 *
 * Not the checkout's prisma.config.ts: that is TypeScript, imports dotenv and
 * uses the env() helper - none of which exist in the runtime image. Plain
 * .mjs reading process.env: the stack supplies DATABASE_URL, the same variable
 * the app connects with, so the push and the queries after it cannot point at
 * different databases.
 */
export default {
  schema: "prisma/schema.prisma",
  datasource: { url: process.env.DATABASE_URL },
};
