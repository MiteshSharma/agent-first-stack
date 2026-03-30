#!/bin/sh
set -e

cd /app/packages/backend

# Run migrations if RUN_MIGRATIONS is set
if [ "$RUN_MIGRATIONS" = "true" ]; then
  echo "Running database migrations..."
  node -e "
    const { Pool } = require('pg');
    const { drizzle } = require('drizzle-orm/node-postgres');
    const { migrate } = require('drizzle-orm/node-postgres/migrator');

    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const db = drizzle(pool);

    migrate(db, { migrationsFolder: './drizzle' })
      .then(() => { console.log('Migrations complete'); return pool.end(); })
      .then(() => process.exit(0))
      .catch(err => { console.error('Migration failed:', err); process.exit(1); });
  "
fi

# Start the server
exec node dist/index.js
