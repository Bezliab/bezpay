import app from './app.js';
import { env } from './config/env.js';
import { pool } from './config/db.js';
import { startJobs } from './jobs/index.js';

const server = app.listen(env.PORT, () => {
  console.log(`BezPay API on :${env.PORT} (${env.NODE_ENV}, Monnify ${env.MONNIFY_ENV})`);
  startJobs();
});

const shutdown = async () => {
  server.close(async () => { await pool.end(); process.exit(0); });
};
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
