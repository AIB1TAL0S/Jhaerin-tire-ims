import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { settings, deliveryProviders, products, stockIn } from '$lib/server/db/schema';
import type { Settings, DeliveryProvider } from '$lib/server/db/schema';

// ─── Settings queries ─────────────────────────────────────────────────────────

/**
 * Returns the single settings row, creating a default one if it doesn't exist.
 */
export async function getSettings(): Promise<Settings> {
	const rows = await db.select().from(settings).limit(1);

	if (rows[0]) return rows[0];

	// Bootstrap default settings row
	const inserted = await db
		.insert(settings)
		.values({})
		.returning();

	return inserted[0];
}

/**
 * Updates the settings row (upsert by updating the single row).
 */
export async function updateSettings(data: Partial<Omit<Settings, 'id' | 'updatedAt'>>): Promise<Settings> {
	const existing = await getSettings();

	const rows = await db
		.update(settings)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(settings.id, existing.id))
		.returning();

	return rows[0];
}

// ─── Delivery provider queries ────────────────────────────────────────────────

/**
 * Returns all delivery providers ordered by name.
 */
export async function getDeliveryProviders(): Promise<DeliveryProvider[]> {
	return db
		.select()
		.from(deliveryProviders)
		.orderBy(deliveryProviders.name);
}

/**
 * Inserts a new delivery provider.
 */
export async function insertDeliveryProvider(name: string): Promise<DeliveryProvider> {
	const rows = await db
		.insert(deliveryProviders)
		.values({ name })
		.returning();

	return rows[0];
}

/**
 * Updates a delivery provider's name.
 */
export async function updateDeliveryProvider(id: string, name: string): Promise<DeliveryProvider> {
	const rows = await db
		.update(deliveryProviders)
		.set({ name })
		.where(eq(deliveryProviders.id, id))
		.returning();

	if (!rows[0]) throw new Error(`Delivery provider ${id} not found`);
	return rows[0];
}

/**
 * Deletes a delivery provider.
 * Returns an error string if active products or stockIn records reference it.
 * Returns null on success.
 */
export async function deleteDeliveryProvider(id: string): Promise<string | null> {
	// Fetch the provider name first
	const providerRows = await db
		.select({ name: deliveryProviders.name })
		.from(deliveryProviders)
		.where(eq(deliveryProviders.id, id))
		.limit(1);

	if (!providerRows[0]) return 'Delivery provider not found.';
	const providerName = providerRows[0].name;

	// Check for active product references
	const productRefs = await db
		.select({ id: products.id })
		.from(products)
		.where(
			and(
				eq(products.deliveryProvider, providerName),
				eq(products.isArchived, false)
			)
		)
		.limit(1);

	if (productRefs.length > 0) {
		return `Cannot delete "${providerName}" — it is referenced by active products. Archive or reassign those products first.`;
	}

	// Check for stockIn references
	const stockInRefs = await db
		.select({ id: stockIn.id })
		.from(stockIn)
		.where(eq(stockIn.deliveryProvider, providerName))
		.limit(1);

	if (stockInRefs.length > 0) {
		return `Cannot delete "${providerName}" — it is referenced by Stock-In records.`;
	}

	await db.delete(deliveryProviders).where(eq(deliveryProviders.id, id));
	return null;
}
