#!/bin/sh
set -e

# Baseline the initial migration if the database already has schema
# (handles P3005 error on first deploy against existing database)
node_modules/.bin/prisma migrate resolve --applied "20260525084643_init" 2>/dev/null || true

# Deploy any new migrations
node_modules/.bin/prisma migrate deploy

# Start the app
node dist/src/main
