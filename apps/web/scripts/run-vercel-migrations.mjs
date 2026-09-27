import { spawnSync } from 'node:child_process';

const runningOnVercel = process.env.VERCEL === '1';
const forceMigrations = process.env.RUN_DB_MIGRATIONS_ON_BUILD === 'true';
const skipMigrations = process.env.SKIP_DB_MIGRATIONS === 'true';

if (skipMigrations) {
  console.log('⏭️ Skipping database migrations (SKIP_DB_MIGRATIONS=true)');
  process.exit(0);
}

if (!runningOnVercel && !forceMigrations) {
  process.exit(0);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is required to run build-time database migrations.');
  process.exit(1);
}

console.log('🔄 Running database migrations before Next.js build...');
const result = spawnSync('pnpm', ['--filter', '@tasknebula/db', 'db:migrate:prod'], {
  stdio: 'inherit',
});

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

console.log('✅ Database migrations completed.');
