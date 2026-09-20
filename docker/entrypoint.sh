#!/bin/sh
# Bring the database schema up to date, then start the server - in that
# order, always, so the app never serves on a schema it does not match.
#
# This project applies its schema with `prisma db push` (no migration
# files), so that is what runs here. Non-interactively it refuses any change
# that would lose data: `set -e` then exits before `node server.js`, the
# container restarts, and you get a visible crash loop instead of a silent
# mismatch. The way out of a bad push is to roll the stack's TAG back.
set -e

echo "→ pushing Prisma schema"
cd /app/prisma-push
prisma db push
cd /app

echo "→ schema in sync, starting Nexus"
exec "$@"
