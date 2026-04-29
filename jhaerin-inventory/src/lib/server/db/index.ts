import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { env } from '$env/dynamic/private';

if (!env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

// PgBouncer (Supabase connection pooler) requires prepared statements to be
// disabled. The connection URL uses port 6543 which routes through PgBouncer
// in transaction mode — prepared statements are not supported there.
const client = postgres(env.DATABASE_URL, {
	prepare: false,
	connect_timeout: 10,
	idle_timeout: 20,
	max_lifetime: 60 * 10
});

export const db = drizzle(client, { schema });
