#!/usr/bin/env node
// Runs SQL migrations from app/db/migrations/ in numeric order.
// Tracks applied migrations in a `schema_migrations` table so each file runs once.
// Usage:
//   npm run migrate              — run all pending migrations
//   npm run migrate 009_...sql  — run a specific file only

const { createClient } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, 'migrations');

async function main() {
  const specificFile = process.argv[2];
  const client = createClient();
  await client.connect();

  try {
    // Ensure tracking table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        filename   TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    // Collect migration files
    let files = fs
      .readdirSync(MIGRATIONS_DIR)
      .filter(f => f.endsWith('.sql'))
      .sort();

    if (specificFile) {
      files = files.filter(f => f === specificFile || f.startsWith(specificFile));
      if (files.length === 0) {
        console.error(`No migration file matching: ${specificFile}`);
        process.exit(1);
      }
    }

    // Fetch already-applied migrations
    const { rows } = await client.query('SELECT filename FROM schema_migrations');
    const applied = new Set(rows.map(r => r.filename));

    let ran = 0;
    for (const file of files) {
      if (applied.has(file)) {
        console.log(`  skip  ${file}`);
        continue;
      }

      const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8');
      console.log(`  run   ${file}`);

      await client.query('BEGIN');
      try {
        // Split on ';' only outside dollar-quoted blocks ($$...$$)
        const statements = splitStatements(sql);

        for (const stmt of statements) {
          // CONCURRENTLY must run outside a transaction
          if (/CREATE\s+INDEX\s+CONCURRENTLY/i.test(stmt)) {
            await client.query('COMMIT');
            await client.query(stmt);
            await client.query('BEGIN');
          } else {
            await client.query(stmt);
          }
        }

        await client.query(
          'INSERT INTO schema_migrations (filename) VALUES ($1) ON CONFLICT DO NOTHING',
          [file],
        );
        await client.query('COMMIT');
        console.log(`  done  ${file}`);
        ran++;
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`  FAIL  ${file}: ${err.message}`);
        process.exit(1);
      }
    }

    if (ran === 0) {
      console.log('No pending migrations.');
    } else {
      console.log(`\n${ran} migration(s) applied.`);
    }
  } finally {
    await client.end();
  }
}

// Splits a SQL file into individual statements, respecting $$-quoted blocks.
function splitStatements(sql) {
  const statements = [];
  let current = '';
  let inDollarQuote = false;
  let dollarTag = '';
  let i = 0;

  while (i < sql.length) {
    // Detect start/end of dollar-quoted string (e.g. $$ or $tag$)
    if (!inDollarQuote) {
      const tagMatch = sql.slice(i).match(/^(\$[^$]*\$)/);
      if (tagMatch) {
        dollarTag = tagMatch[1];
        inDollarQuote = true;
        current += dollarTag;
        i += dollarTag.length;
        continue;
      }
    } else {
      if (sql.slice(i).startsWith(dollarTag)) {
        current += dollarTag;
        i += dollarTag.length;
        inDollarQuote = false;
        dollarTag = '';
        continue;
      }
    }

    const ch = sql[i];
    if (ch === ';' && !inDollarQuote) {
      const stmt = current.trim();
      if (stmt) statements.push(stmt);
      current = '';
    } else {
      current += ch;
    }
    i++;
  }

  const last = current.trim();
  if (last) statements.push(last);
  return statements;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
