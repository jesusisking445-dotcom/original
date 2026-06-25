#!/bin/sh
set -e

# Parse host:port out of MONGODB_URI (e.g. mongodb://user:pass@mongodb:27017/db)
# so we can wait for it without needing separate MONGODB_HOST/PORT env vars.
if [ -n "$MONGODB_URI" ]; then
  MONGO_HOSTPORT=$(echo "$MONGODB_URI" | sed -E 's#^mongodb(\+srv)?://([^@]*@)?([^/?]+).*#\3#')
  MONGO_HOST=$(echo "$MONGO_HOSTPORT" | cut -d: -f1)
  MONGO_PORT=$(echo "$MONGO_HOSTPORT" | cut -d: -f2)
  [ "$MONGO_PORT" = "$MONGO_HOST" ] && MONGO_PORT=27017

  echo "Waiting for MongoDB at $MONGO_HOST:$MONGO_PORT..."
  until nc -z "$MONGO_HOST" "$MONGO_PORT" 2>/dev/null; do
    echo "MongoDB is unavailable - sleeping"
    sleep 2
  done
  echo "MongoDB is ready"
fi

if [ "$NODE_ENV" = "production" ] || [ "$NODE_ENV" = "development" ]; then
  echo "Running database migrations..."
  npm run migrate || echo "Migration step skipped/failed — continuing (safe if already migrated)"

  echo "Seeding database (safe to skip if already seeded)..."
  npm run seed || echo "Seed step skipped/failed — continuing"
fi

exec "$@"
