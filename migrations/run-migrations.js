const fs = require('fs');
const path = require('path');
const { pool, withTransaction } = require('../src/db');

async function runMigrations() {
  console.log('--- Starting PostgreSQL Database Migrations ---');
  
  try {
    // 1. Create migration tracking table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Fetch already executed migrations
    const { rows: appliedRows } = await pool.query('SELECT filename FROM schema_migrations');
    const appliedFiles = new Set(appliedRows.map((r) => r.filename));

    // 3. Read migration files sorted by name
    const migrationsDir = __dirname;
    const files = fs.readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();

    if (files.length === 0) {
      console.log('No SQL migration files found.');
      process.exit(0);
    }

    let appliedCount = 0;
    for (const file of files) {
      if (appliedFiles.has(file)) {
        console.log(`[SKIPPED] ${file} (already applied)`);
        continue;
      }

      console.log(`[APPLYING] ${file}...`);
      const filePath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(filePath, 'utf8');

      await withTransaction(async (client) => {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (filename) VALUES ($1)', [file]);
      });

      console.log(`[SUCCESS] ${file} applied successfully.`);
      appliedCount++;
    }

    console.log(`--- Migration Finished. Applied: ${appliedCount} new file(s) ---`);
    process.exit(0);
  } catch (err) {
    console.error('Migration failed with error:', err);
    process.exit(1);
  }
}

runMigrations();
