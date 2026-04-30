import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// Supabase connection pooler (port 6543) uses PgBouncer in transaction mode.
// Prepared statements must be disabled for PgBouncer compatibility.
const client = postgres(env.DATABASE_URL, {
	prepare: false
});

export const db = drizzle(client, { schema });
