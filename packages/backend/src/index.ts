import { buildApp } from './app';
import { pool } from './db';
import { env } from './lib/env';

async function main(): Promise<void> {
  const app = await buildApp();

  try {
    // Verify database connectivity at startup
    await pool.query('SELECT 1');
    app.log.info('Database connected');

    // Start server
    await app.listen({ port: env.PORT, host: env.HOST });
    app.log.info(`Server running at http://${env.HOST}:${env.PORT}`);
    app.log.info(`API docs at http://localhost:${env.PORT}/docs`);
  } catch (err) {
    app.log.fatal({ err }, 'Failed to start server');
    process.exit(1);
  }

  // Graceful shutdown
  const signals: NodeJS.Signals[] = ['SIGINT', 'SIGTERM'];
  for (const signal of signals) {
    process.on(signal, async () => {
      app.log.info(`Received ${signal}, shutting down gracefully...`);
      try {
        await app.close();
        await pool.end();
        app.log.info('Server shut down');
        process.exit(0);
      } catch (err) {
        app.log.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
    });
  }
}

main();
