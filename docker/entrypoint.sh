#!/bin/sh
set -e

cd /app/packages/backend

# Run migrations if RUN_MIGRATIONS is set
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running database migrations..."
  node -e "
    require('reflect-metadata');
    const { AppDataSource } = require('./dist/lib/data-source');
    AppDataSource.initialize()
      .then(ds => ds.runMigrations())
      .then(() => { console.log('Migrations complete'); process.exit(0); })
      .catch(err => { console.error('Migration failed:', err); process.exit(1); });
  "
fi

# Start the server
exec node dist/index.js
