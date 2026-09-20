# syntax=docker/dockerfile:1
#
# Nexus image. Build from the repo root:
#
#   docker build -t nexus .
#
# Nothing hostname-specific is baked in: the browser calls the API
# relatively, so one image serves any domain. Configuration is entirely from
# the environment - see deploy/docker-compose.yml.

# ---------------------------------------------------------------------------
# Build
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS build
WORKDIR /repo

RUN npm install --global pnpm@10

ENV NEXT_TELEMETRY_DISABLED=1
# prisma.config.ts resolves DATABASE_URL at load time and `pnpm install`
# runs `prisma generate` (postinstall); neither connects, but the variable
# has to exist.
ENV DATABASE_URL="postgresql://build:build@localhost:5432/build?schema=public"
# Better-Auth is instantiated during static page generation and logs an error
# without a secret. Build-only values; nothing here reaches the image.
ENV BETTER_AUTH_SECRET=build-only-not-a-real-secret-0000
ENV BETTER_AUTH_URL=http://localhost:3000

COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma
COPY prisma.config.ts ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

# ---------------------------------------------------------------------------
# Runtime
# ---------------------------------------------------------------------------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# The Prisma CLI applies the schema on startup (docker/entrypoint.sh). Pinned
# to the version in package.json; bump both together.
RUN npm install --global prisma@7.10.0 && npm cache clean --force

# standalone/ carries server.js and the traced node_modules; static/ and
# public/ are outside it and have to be copied separately, or the app serves
# HTML with every stylesheet and script 404ing.
COPY --from=build /repo/.next/standalone ./
COPY --from=build /repo/.next/static ./.next/static
COPY --from=build /repo/public ./public

# Schema + a plain-JS config for `prisma db push` (the checkout's
# prisma.config.ts is TypeScript and imports dotenv - neither exists here).
COPY prisma/schema.prisma ./prisma-push/prisma/schema.prisma
COPY docker/prisma.config.mjs ./prisma-push/prisma.config.mjs
COPY docker/entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh

USER node
EXPOSE 3000

ENTRYPOINT ["./entrypoint.sh"]
CMD ["node", "server.js"]
