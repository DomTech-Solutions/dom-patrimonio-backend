import Postgrator from 'postgrator';
import { Pool } from 'pg';
import path from 'path';

export async function runMigrations(dbPool: Pool) {
    try {
        console.log('🔄 A iniciar processo de migração (Postgrator)...');
        
        // Bootstrap manual exigido na SDD
        const client = await dbPool.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS schema_migrations (
                version BIGINT PRIMARY KEY,
                name TEXT,
                md5 TEXT,
                run_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
            );
        `);
        client.release();

        const postgrator = new Postgrator({
            migrationPattern: path.join(__dirname, '../../../db/migrations/*'),
            driver: 'pg',
            schemaTable: 'schema_migrations',
            validateChecksums: false,
            execQuery: (query) => dbPool.query(query),
        });

        const result = await postgrator.migrate();
        if (result.length > 0) {
            console.log(`✅ Migrações aplicadas com sucesso: ${result.length} ficheiro(s).`);
        } else {
            console.log('✨ O banco de dados já está atualizado.');
        }
        return result;
    } catch (error) {
        console.error('❌ Erro crítico ao correr as migrações:', error);
        throw error;
    }
}
