/**
 * Unseed script — removes all seeded data from the database.
 * Preserves: users, settings, delivery providers (managed via Settings UI)
 * Removes: sales, stock_in, stock_out, products, notifications, activity_logs
 *
 * Run with: npm run db:unseed
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(process.env.DATABASE_URL, { prepare: false });
const db = drizzle(client, { schema });

async function unseed() {
	console.log('🗑️  Removing seeded data...');

	// Delete in FK-safe order (dependents first)
	const salesCount = await db.delete(schema.sales).returning({ id: schema.sales.id });
	console.log(`  ✓ Deleted ${salesCount.length} sales records`);

	const stockOutCount = await db.delete(schema.stockOut).returning({ id: schema.stockOut.id });
	console.log(`  ✓ Deleted ${stockOutCount.length} stock-out records`);

	const stockInCount = await db.delete(schema.stockIn).returning({ id: schema.stockIn.id });
	console.log(`  ✓ Deleted ${stockInCount.length} stock-in records`);

	const productCount = await db.delete(schema.products).returning({ id: schema.products.id });
	console.log(`  ✓ Deleted ${productCount.length} products`);

	const notifCount = await db.delete(schema.notifications).returning({ id: schema.notifications.id });
	console.log(`  ✓ Deleted ${notifCount.length} notifications`);

	const logCount = await db.delete(schema.activityLogs).returning({ id: schema.activityLogs.id });
	console.log(`  ✓ Deleted ${logCount.length} activity logs`);

	console.log('\n✅ Unseed complete! All module data cleared.');
	console.log('   Preserved: users, settings, delivery providers');

	await client.end();
}

unseed().catch((err) => {
	console.error('❌ Unseed failed:', err);
	process.exit(1);
});
