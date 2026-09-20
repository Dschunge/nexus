# Deploying Nexus to the VPS

Same shape as the other apps on the box: GitHub Actions builds the image and
pushes it to GHCR, Portainer runs it as a stack from `deploy/docker-compose.yml`,
Nginx Proxy Manager terminates TLS and forwards to the container by name.

```
browser ──▶ NPM (nexus.aigentik.org) ──proxy network──▶ nexus:3000 ──▶ Postgres
                                                                       (postgresql-7tjt-postgresql-1:5432/nexus)
```

## One-time setup

1. **DNS.** `nexus` A record → `72.61.77.138`, **DNS-only (grey cloud)**, like
   the other hosts.

2. **Database.** Create an empty database on the VPS Postgres. From a shell on
   the VPS:

   ```bash
   docker exec -it postgresql-7tjt-postgresql-1 psql -U <admin-user> -c 'CREATE DATABASE nexus;'
   ```

   The tables are created by the container itself on first start (see
   "Schema" below). The old `aigentik-admin` database is not used.

3. **Image.** Push to `main` (or run "Publish image" from the Actions tab) and
   wait for `ghcr.io/dschunge/nexus:<sha>` to exist. The repository is public,
   so the package is public and Portainer needs no registry login.

4. **Stack.** Portainer → Stacks → Add stack → Repository, or paste
   `deploy/docker-compose.yml`. Environment variables, **no quotes around any
   value**:

   | Variable | Value |
   | --- | --- |
   | `TAG` | short commit SHA from the workflow summary |
   | `DATABASE_URL` | `postgresql://<user>:<pass>@postgresql-7tjt-postgresql-1:5432/nexus?schema=public` |
   | `BETTER_AUTH_SECRET` | `openssl rand -base64 32` — a new one for production; the local one signs local sessions only |
   | `ANTHROPIC_API_KEY` | your key |
   | `FIRECRAWL_API_KEY` | your key |
   | `DISABLE_SIGNUP` | leave unset / `false` for the first deploy |

   The database host is the **container name**; the short alias `postgresql`
   returns SERVFAIL on that network.

5. **NPM proxy host**, Let's Encrypt certificate, websockets on:

   | Domain | Forward Hostname | Forward Port |
   | --- | --- | --- |
   | `nexus.aigentik.org` | `nexus` | `3000` |

   Forward to the **container name and internal port**, not to
   `127.0.0.1:3320`. NPM runs in a container, so `127.0.0.1` there is NPM
   itself and every request 502s behind a valid certificate. The published
   `3320` exists only for `curl` from a shell on the VPS.

6. **Create your account** at `https://nexus.aigentik.org/signup`, then set
   `DISABLE_SIGNUP=true` in the stack and redeploy. From then on `/signup`
   redirects to `/login`, the sign-up link is hidden and Better-Auth rejects
   sign-up requests. Skipping this leaves registration open to anyone who
   finds the URL, on your Anthropic and Firecrawl keys.

## Redeploying

Push to `main` → note the SHA in the workflow summary → set `TAG` in the stack
→ Update the stack (re-pull is implied by the new tag).

## Schema

**It applies itself, before the server starts.** `docker/entrypoint.sh` runs
`prisma db push` and only then execs `node server.js`, so the app never serves
on a schema it does not match. This project has no migration files (see
`CLAUDE.md`), so `db push` is the same operation used locally.

Non-interactively, `db push` refuses any change that would lose data: the
entrypoint's `set -e` exits, the container restarts and you get a visible
crash loop rather than a silent mismatch. The way out is to roll `TAG` back to
the previous image and sort the database out by hand.

The CLI is **pinned in the Dockerfile** (`prisma@7.10.0`) and must be bumped
together with `prisma` in `package.json`.

## Things that will bite you

**`BETTER_AUTH_URL` must equal the public origin exactly** (scheme + host, no
trailing slash). It is Better-Auth's `baseURL` and, in production, its only
`trustedOrigins` entry; a mismatch rejects every login with an origin error
that reads like a wrong password.

**Nothing hostname-specific is in the image.** The browser calls `/api/trpc`
relatively (`lib/trpc/client.tsx`), so one image serves any domain and
`NEXT_PUBLIC_APP_URL` is only used for the server-side render. It is still
set in the stack for that reason.

**`DISABLE_SIGNUP` is read per request.** The login and signup pages are
`force-dynamic` for exactly this; without it Next would prerender them at
build time and freeze the flag's build-time value into the page.

**Service names are global on the shared `proxy` network.** Keep it `nexus`.

**Do not put a `.env` in the image.** `.dockerignore` excludes it; the
container is configured from the stack's environment only.
