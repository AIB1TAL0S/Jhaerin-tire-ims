/**
 * Database seed script for JTIMS
 * Run with: npx tsx src/lib/server/db/seed.ts
 *
 * Seeds: delivery providers, products, stock-in, stock-out, sales
 * Does NOT seed users — create the Owner via Supabase Auth directly.
 */

import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';
import * as schema from './schema';

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const client = postgres(process.env.DATABASE_URL, { prepare: false });
const db = drizzle(client, { schema });

// ─── Helpers ─────────────────────────────────────────────────────────────────

function daysAgo(n: number): Date {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return d;
}

function randomBetween(min: number, max: number): number {
	return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ─── Seed data ────────────────────────────────────────────────────────────────

async function seed() {
	console.log('🌱 Seeding database...');

	// ── Delivery providers ────────────────────────────────────────────────────
	console.log('  → Delivery providers');
	const providers = await db
		.insert(schema.deliveryProviders)
		.values([
			{ name: 'Bridgestone Philippines' },
			{ name: 'Michelin Asia Pacific' },
			{ name: 'Goodyear Philippines' },
			{ name: 'Continental Tires PH' },
			{ name: 'Yokohama Tire Corp' }
		])
		.onConflictDoNothing()
		.returning();

	const providerNames = providers.map((p) => p.name);
	if (providerNames.length === 0) {
		console.log('  ⚠ Providers already exist, skipping...');
	}

	// ── Products ──────────────────────────────────────────────────────────────
	console.log('  → Products');
	const productData = [
		// Bridgestone
		{ brand: 'Bridgestone', size: '185/65R15', pattern: 'Ecopia EP150', costPrice: '2800', retailPrice: '3500', deliveryProvider: 'Bridgestone Philippines', quantity: 24, lowStockThreshold: 5 },
		{ brand: 'Bridgestone', size: '195/65R15', pattern: 'Turanza T005', costPrice: '3200', retailPrice: '4000', deliveryProvider: 'Bridgestone Philippines', quantity: 18, lowStockThreshold: 5 },
		{ brand: 'Bridgestone', size: '205/55R16', pattern: 'Potenza RE003', costPrice: '4500', retailPrice: '5800', deliveryProvider: 'Bridgestone Philippines', quantity: 12, lowStockThreshold: 4 },
		{ brand: 'Bridgestone', size: '215/60R16', pattern: 'Dueler H/T 684', costPrice: '5200', retailPrice: '6500', deliveryProvider: 'Bridgestone Philippines', quantity: 8, lowStockThreshold: 3 },
		{ brand: 'Bridgestone', size: '225/45R17', pattern: 'Potenza S001', costPrice: '6800', retailPrice: '8500', deliveryProvider: 'Bridgestone Philippines', quantity: 6, lowStockThreshold: 3 },

		// Michelin
		{ brand: 'Michelin', size: '185/65R15', pattern: 'Energy XM2+', costPrice: '3100', retailPrice: '3900', deliveryProvider: 'Michelin Asia Pacific', quantity: 20, lowStockThreshold: 5 },
		{ brand: 'Michelin', size: '205/55R16', pattern: 'Primacy 4', costPrice: '5000', retailPrice: '6200', deliveryProvider: 'Michelin Asia Pacific', quantity: 14, lowStockThreshold: 4 },
		{ brand: 'Michelin', size: '215/65R16', pattern: 'Latitude Tour HP', costPrice: '5800', retailPrice: '7200', deliveryProvider: 'Michelin Asia Pacific', quantity: 10, lowStockThreshold: 3 },
		{ brand: 'Michelin', size: '225/50R17', pattern: 'Pilot Sport 4', costPrice: '7500', retailPrice: '9500', deliveryProvider: 'Michelin Asia Pacific', quantity: 8, lowStockThreshold: 3 },

		// Goodyear
		{ brand: 'Goodyear', size: '185/65R15', pattern: 'Assurance TripleMax 2', costPrice: '2600', retailPrice: '3300', deliveryProvider: 'Goodyear Philippines', quantity: 22, lowStockThreshold: 5 },
		{ brand: 'Goodyear', size: '195/65R15', pattern: 'EfficientGrip Performance', costPrice: '3000', retailPrice: '3800', deliveryProvider: 'Goodyear Philippines', quantity: 16, lowStockThreshold: 5 },
		{ brand: 'Goodyear', size: '205/55R16', pattern: 'Eagle F1 Asymmetric 3', costPrice: '4800', retailPrice: '6000', deliveryProvider: 'Goodyear Philippines', quantity: 10, lowStockThreshold: 4 },
		{ brand: 'Goodyear', size: '235/60R18', pattern: 'Wrangler HP All Weather', costPrice: '6500', retailPrice: '8200', deliveryProvider: 'Goodyear Philippines', quantity: 6, lowStockThreshold: 2 },

		// Continental
		{ brand: 'Continental', size: '195/65R15', pattern: 'ComfortContact CC6', costPrice: '2900', retailPrice: '3700', deliveryProvider: 'Continental Tires PH', quantity: 18, lowStockThreshold: 5 },
		{ brand: 'Continental', size: '205/55R16', pattern: 'PremiumContact 6', costPrice: '4600', retailPrice: '5900', deliveryProvider: 'Continental Tires PH', quantity: 12, lowStockThreshold: 4 },
		{ brand: 'Continental', size: '225/45R17', pattern: 'SportContact 6', costPrice: '7200', retailPrice: '9000', deliveryProvider: 'Continental Tires PH', quantity: 4, lowStockThreshold: 2 },

		// Yokohama
		{ brand: 'Yokohama', size: '185/65R15', pattern: 'BluEarth AE01', costPrice: '2500', retailPrice: '3200', deliveryProvider: 'Yokohama Tire Corp', quantity: 26, lowStockThreshold: 6 },
		{ brand: 'Yokohama', size: '205/55R16', pattern: 'ADVAN Sport V105', costPrice: '4400', retailPrice: '5600', deliveryProvider: 'Yokohama Tire Corp', quantity: 14, lowStockThreshold: 4 },
		{ brand: 'Yokohama', size: '215/65R16', pattern: 'Geolandar A/T G015', costPrice: '5500', retailPrice: '7000', deliveryProvider: 'Yokohama Tire Corp', quantity: 8, lowStockThreshold: 3 },
		{ brand: 'Yokohama', size: '265/65R17', pattern: 'Geolandar M/T G003', costPrice: '8500', retailPrice: '10500', deliveryProvider: 'Yokohama Tire Corp', quantity: 4, lowStockThreshold: 2 },
	];

	const insertedProducts = await db
		.insert(schema.products)
		.values(productData)
		.onConflictDoNothing()
		.returning();

	console.log(`  ✓ Inserted ${insertedProducts.length} products`);

	if (insertedProducts.length === 0) {
		console.log('  ⚠ Products already exist. Fetching existing...');
		const existing = await db.select().from(schema.products);
		insertedProducts.push(...existing);
	}

	// ── Stock-In records ──────────────────────────────────────────────────────
	console.log('  → Stock-In records');
	const stockInData = insertedProducts.slice(0, 10).map((p, i) => ({
		productId: p.id,
		quantity: randomBetween(10, 30),
		deliveryProvider: p.deliveryProvider,
		date: daysAgo(randomBetween(30, 90))
	}));

	await db.insert(schema.stockIn).values(stockInData).onConflictDoNothing();
	console.log(`  ✓ Inserted ${stockInData.length} stock-in records`);

	// ── Stock-Out records ─────────────────────────────────────────────────────
	console.log('  → Stock-Out records');
	const stockOutData = insertedProducts.slice(0, 8).map((p, i) => ({
		productId: p.id,
		quantity: randomBetween(1, 4),
		reason: ['Damaged in transit', 'Customer return', 'Quality check failure', 'Transferred to branch'][i % 4],
		date: daysAgo(randomBetween(5, 25))
	}));

	await db.insert(schema.stockOut).values(stockOutData).onConflictDoNothing();
	console.log(`  ✓ Inserted ${stockOutData.length} stock-out records`);

	// ── Sales records ─────────────────────────────────────────────────────────
	console.log('  → Sales records');
	const salesData: typeof schema.sales.$inferInsert[] = [];

	// Generate 30 sales spread over the last 60 days
	for (let i = 0; i < 30; i++) {
		const product = insertedProducts[i % insertedProducts.length];
		const qty = randomBetween(1, 4);
		const cost = Number(product.costPrice);
		const retail = Number(product.retailPrice);
		const revenue = qty * retail;
		const totalCost = qty * cost;
		const grossProfit = revenue - totalCost;

		salesData.push({
			productId: product.id,
			quantitySold: qty,
			revenue: String(revenue),
			cost: String(totalCost),
			grossProfit: String(grossProfit),
			date: daysAgo(randomBetween(1, 60))
		});
	}

	await db.insert(schema.sales).values(salesData).onConflictDoNothing();
	console.log(`  ✓ Inserted ${salesData.length} sales records`);

	// ── Settings ──────────────────────────────────────────────────────────────
	console.log('  → Settings');
	await db
		.insert(schema.settings)
		.values({
			globalLowStockThreshold: 5,
			deadStockDays: 90,
			theme: 'dark',
			dateFormat: 'MM/DD/YYYY',
			defaultReportDateRange: '30d'
		})
		.onConflictDoNothing();
	console.log('  ✓ Settings initialized');

	console.log('\n✅ Seed complete!');
	console.log('\nNext steps:');
	console.log('  1. Create the Owner account via Supabase Auth dashboard');
	console.log('  2. Insert the Owner into the users table:');
	console.log('     INSERT INTO users (id, email, name, role) VALUES (\'<supabase-user-id>\', \'owner@example.com\', \'Owner Name\', \'Owner\');');

	await client.end();
}

seed().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
