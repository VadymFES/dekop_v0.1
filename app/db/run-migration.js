#!/usr/bin/env node

/**
 * Database Migration Runner
 * Runs SQL migration files against the database
 */

const { sql } = require('@vercel/postgres');
const fs = require('fs');
const path = require('path');

async function runMigration(migrationFile) {
  try {
    console.log(`\n📦 Running migration: ${migrationFile}`);
    
    const migrationPath = path.join(__dirname, 'migrations', migrationFile);
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');
    
    // Split by statement (simple approach - assumes proper formatting)
    const statements = migrationSQL
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`   Found ${statements.length} SQL statements`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (let i = 0; i < statements.length; i++) {
      try {
        await sql.query(statements[i]);
        successCount++;
      } catch (error) {
        // Ignore "already exists" errors
        if (error.message.includes('already exists')) {
          console.log(`   ⚠️  Statement ${i + 1}: Already exists (skipped)`);
          successCount++;
        } else {
          console.error(`   ❌ Statement ${i + 1} failed:`, error.message);
          errorCount++;
        }
      }
    }
    
    console.log(`   ✅ ${successCount} statements succeeded`);
    if (errorCount > 0) {
      console.log(`   ❌ ${errorCount} statements failed`);
    }
    
    return errorCount === 0;
  } catch (error) {
    console.error(`❌ Migration failed:`, error);
    return false;
  }
}

async function main() {
  const migrationFile = process.argv[2] || '004_create_users_and_gdpr_tables.sql';
  
  console.log('🚀 Database Migration Runner');
  console.log('============================');
  
  if (!process.env.POSTGRES_URL) {
    console.error('❌ Error: POSTGRES_URL environment variable not set');
    console.log('\nPlease set your database connection string:');
    console.log('  export POSTGRES_URL="postgresql://..."');
    process.exit(1);
  }
  
  const success = await runMigration(migrationFile);
  
  if (success) {
    console.log('\n✅ Migration completed successfully!');
    process.exit(0);
  } else {
    console.log('\n❌ Migration completed with errors');
    process.exit(1);
  }
}

main().catch(console.error);
