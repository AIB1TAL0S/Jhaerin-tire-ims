import { eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, users } from '$lib/server/db/schema';
import {
	insertProduct,
	updateProduct,
	archiveProduct as archiveProductModel,
	getProductById
} from '$lib/server/models/inventory';
import { insertNotification } from '$lib/server/models/notifications';
import type { NewProduct } from '$lib/server/db/schema';
import type { Result } from '$lib/utils/result';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface NewProductInput {
	brand: string;
	size: string;
	pattern: string;
	quantity: number;
	costPrice: string;
	retailPrice: string;
	deliveryProvider: string;
	lowStockThreshold: number;
}

export type UpdateProductInput = Partial<NewProductInput>;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Checks whether a product with the given brand+size+pattern already exists,
 * optionally excluding a specific product ID (for edit uniqueness checks).
 */
async function isDuplicate(
	brand: string,
	size: string,
	pattern: string,
	excludeId?: string
): Promise<boolean> {
	const conditions = [
		eq(products.brand, brand),
		eq(products.size, size),
		eq(products.pattern, pattern)
	];

	const rows = await db
		.select({ id: products.id })
		.from(products)
		.where(and(...conditions))
		.limit(1);

	if (rows.length === 0) return false;
	// If we're editing, the match is only a duplicate if it's a different product
	return excludeId ? rows[0].id !== excludeId : true;
}

/**
 * Triggers a low-stock notification for all Owner users if the product
 * quantity is at or below its threshold. Failures are non-fatal.
 */
async function checkAndNotifyLowStock(product: {
	id: string;
	brand: string;
	size: string;
	pattern: string;
	quantity: number;
	lowStockThreshold: number;
}): Promise<void> {
	if (product.quantity > product.lowStockThreshold) return;

	try {
		// Fan out to all Owner users
		const ownerRows = await db
			.select({ id: users.id })
			.from(users)
			.where(eq(users.role, 'Owner'));

		const message = `Low stock alert: ${product.brand} ${product.size} ${product.pattern} — only ${product.quantity} unit(s) remaining (threshold: ${product.lowStockThreshold}).`;

		await Promise.all(
			ownerRows.map((owner) =>
				insertNotification({
					userId: owner.id,
					type: 'low_stock',
					message
				}).catch(() => {
					// Non-fatal per owner — continue with others
				})
			)
		);
	} catch {
		// Non-fatal: notification failure must not block the inventory operation
	}
}

// ─── Controller functions ─────────────────────────────────────────────────────

/**
 * Creates a new product after validating brand+size+pattern uniqueness.
 * Triggers a low-stock notification if the initial quantity is at or below threshold.
 */
export async function createProduct(data: NewProductInput): Promise<Result<typeof products.$inferSelect>> {
	const duplicate = await isDuplicate(data.brand, data.size, data.pattern);
	if (duplicate) {
		return {
			success: false,
			error: `A product with brand "${data.brand}", size "${data.size}", and pattern "${data.pattern}" already exists.`
		};
	}

	try {
		const product = await insertProduct({
			brand: data.brand,
			size: data.size,
			pattern: data.pattern,
			quantity: data.quantity,
			costPrice: data.costPrice,
			retailPrice: data.retailPrice,
			deliveryProvider: data.deliveryProvider,
			lowStockThreshold: data.lowStockThreshold
		});

		await checkAndNotifyLowStock(product);

		return { success: true, data: product };
	} catch (err) {
		// Handle DB-level unique constraint violation as a fallback
		const msg = err instanceof Error ? err.message : '';
		if (msg.includes('products_brand_size_pattern_unique')) {
			return {
				success: false,
				error: `A product with brand "${data.brand}", size "${data.size}", and pattern "${data.pattern}" already exists.`
			};
		}
		return { success: false, error: 'Failed to create product. Please try again.' };
	}
}

/**
 * Updates an existing product. Re-validates uniqueness if brand/size/pattern changed.
 * Re-evaluates the low-stock threshold after the update.
 */
export async function updateProductController(
	id: string,
	data: UpdateProductInput
): Promise<Result<typeof products.$inferSelect>> {
	// Only check uniqueness if any of the identifying fields are being changed
	if (data.brand !== undefined || data.size !== undefined || data.pattern !== undefined) {
		const existing = await getProductById(id);
		if (!existing) {
			return { success: false, error: 'Product not found.' };
		}

		const brand = data.brand ?? existing.brand;
		const size = data.size ?? existing.size;
		const pattern = data.pattern ?? existing.pattern;

		const duplicate = await isDuplicate(brand, size, pattern, id);
		if (duplicate) {
			return {
				success: false,
				error: `A product with brand "${brand}", size "${size}", and pattern "${pattern}" already exists.`
			};
		}
	}

	try {
		const updated = await updateProduct(id, {
			...(data.brand !== undefined && { brand: data.brand }),
			...(data.size !== undefined && { size: data.size }),
			...(data.pattern !== undefined && { pattern: data.pattern }),
			...(data.quantity !== undefined && { quantity: data.quantity }),
			...(data.costPrice !== undefined && { costPrice: data.costPrice }),
			...(data.retailPrice !== undefined && { retailPrice: data.retailPrice }),
			...(data.deliveryProvider !== undefined && { deliveryProvider: data.deliveryProvider }),
			...(data.lowStockThreshold !== undefined && { lowStockThreshold: data.lowStockThreshold })
		});

		await checkAndNotifyLowStock(updated);

		return { success: true, data: updated };
	} catch (err) {
		const msg = err instanceof Error ? err.message : '';
		if (msg.includes('products_brand_size_pattern_unique')) {
			return { success: false, error: 'A product with those identifying details already exists.' };
		}
		return { success: false, error: 'Failed to update product. Please try again.' };
	}
}

/**
 * Archives a product (soft delete). The product is hidden from active views
 * but its data is preserved for historical records.
 */
export async function archiveProductController(id: string): Promise<Result<void>> {
	const existing = await getProductById(id);
	if (!existing) {
		return { success: false, error: 'Product not found.' };
	}

	try {
		await archiveProductModel(id);
		return { success: true, data: undefined };
	} catch {
		return { success: false, error: 'Failed to archive product. Please try again.' };
	}
}
