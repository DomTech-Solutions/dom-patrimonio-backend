import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Client } from 'pg';
import { migrate } from 'postgres-migrations';
import path from 'path';
import fs from 'fs';
import { supabase } from './config/supabaseClient';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3020;

app.use(cors({
  origin: 'http://localhost:3030'
}));
app.use(express.json());

// Function to run database migrations on startup
async function runStartupMigrations() {
  const connectionString = process.env.DATABASE_URL;

  if (!connectionString) {
    console.warn('Warning: DATABASE_URL is missing. Skipping startup migrations.');
    return;
  }

  const client = new Client({
    connectionString,
    ssl: connectionString.includes('supabase.co') ? { rejectUnauthorized: false } : false
  });
  
  try {
    console.log('Connecting to database to run migrations...');
    await client.connect();

    const migrationsDir = path.join(__dirname, '../supabase/migrations');
    
    if (!fs.existsSync(migrationsDir)) {
      console.warn(`Migration directory not found at: ${migrationsDir}. Skipping migrations.`);
      return;
    }

    // Check already applied migrations before running newer ones
    let appliedBefore = new Set<string>();
    try {
      const { rows } = await client.query('SELECT name FROM migrations;');
      appliedBefore = new Set(rows.map(r => r.name));
    } catch (e) {
      // The migrations table might not exist yet if it's the first run
      console.log('Migrations table not found. It will be created by the migration runner.');
    }

    console.log('Checking and running pending migrations...');
    await migrate({ client }, migrationsDir);

    // Check applied migrations after run to log exactly which ones were newly applied
    const { rows: rowsAfter } = await client.query('SELECT name FROM migrations ORDER BY id ASC;');
    
    let appliedCount = 0;
    for (const row of rowsAfter) {
      if (!appliedBefore.has(row.name)) {
        console.log(`Migration applied successfully: ${row.name}`);
        appliedCount++;
      }
    }

    if (appliedCount === 0) {
      console.log('No new migrations to apply. Database is up to date.');
    } else {
      console.log(`Successfully applied ${appliedCount} new migration(s).`);
    }

  } catch (err: any) {
    console.error('Failed to run database migrations:', err.message || err);
    process.exit(1); // Exit process if migrations fail to prevent running in a corrupted state
  } finally {
    await client.end();
  }
}

// Register health route with Supabase connectivity check
app.get('/health', async (req, res) => {
  let supabaseStatus = 'online';
  let supabaseError = null;

  try {
    // Tenta uma consulta dummy rápida no Supabase
    const { error } = await supabase.from('_connection_test').select('*').limit(0);
    
    if (error) {
      const isPostgrestError = error.code && (error.code.startsWith('PGRST') || error.code.startsWith('42') || error.code === '42000' || error.code === '42P01');
      
      if (!isPostgrestError) {
        supabaseStatus = 'offline';
        supabaseError = error.message;
      }
    }
  } catch (err: any) {
    supabaseStatus = 'offline';
    supabaseError = err.message || err;
  }

  const isDegraded = supabaseStatus === 'offline';

  res.status(200).json({
    status: isDegraded ? 'degraded' : 'ok',
    app: 'Dom Património Backend',
    timestamp: new Date(),
    services: {
      supabase: supabaseStatus,
      ...(isDegraded && { error: supabaseError })
    }
  });
});

// Register favicon route
app.get('/favicon.ico', (req, res) => {
  res.set('Content-Type', 'image/svg+xml');
  res.send(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><text y=".9em" font-size="90">💰</text></svg>`);
});

// Run migrations and then start the server
runStartupMigrations().then(() => {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
});
