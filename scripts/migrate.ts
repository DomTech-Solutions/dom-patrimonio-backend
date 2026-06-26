import { Pool } from 'pg';
import { runMigrations } from '../src/infrastructure/persistence/migration.service';
import dotenv from 'dotenv';

dotenv.config({ override: true });

async function main() {
    if (!process.env.DATABASE_URL) {
        console.error('❌ DATABASE_URL não definida.');
        process.exit(1);
    }

    const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false }
    });

    try {
        await runMigrations(pool);
        process.exit(0);
    } catch (err) {
        process.exit(1);
    }
}

main();
