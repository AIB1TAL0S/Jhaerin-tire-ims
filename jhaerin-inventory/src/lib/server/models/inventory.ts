import { eq, ilike, or, and, lte, gte, sql, desc, notInArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { products, stockOut, sales } from '$lib/server/db/schema';
import type { Product, NewProduct } from '$lib/server/db/schema';

// ─── Filter types ─────────────────────────────────────────────────────────────

export interface ProductFilters {
	search?: string;           // matches brand, size, or pattern
	deliveryProvider?: string;
	lowStockOnly?: boolean;
	includeArchived?: boolean;
	limit?: number;
	offset?: number;
}

// ─── Product queries ──────────────────────────────────────────────────────────

/**
 * Returns a paginated list of active products, optionally filtered by
 * brand/size/pattern search, delivery provider, and stock level.
 */
export async function getProducts(filters: ProductFilters = {}): Promise<Product[]> {
	const {
		search,
		deliveryProvider,
		lowStockOnly = false,
		includeArchived = false,
		limit = 50,
		offset = 0
	} = filters;

	const conditions = [];

	// Exclude archived products by default
	if (!includeArchived) {
		conditions.push(eq(products.isArchived, false));
	}

	// Full-text search across brand, size, pattern
	if (search) {
		conditions.push(
			or(
				ilike(products.brand, `%${search}%`),
				ilike(products.size, `%${search}%`),
				ilike(products.pattern, `%${search}%`)
			)
		);
	}

	// Filter by delivery provider
	if (deliveryProvider) {
		conditions.push(eq(products.deliveryProvider, deliveryProvider));
	}

	// Filter to only low-stock products
	if (lowStockOnly) {
		conditions.push(lte(products.quantity, products.lowStockThreshold));
	}

	return db
		.select()
		.from(products)
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(desc(products.updatedAt))
		.limit(limit)
		.offset(offset);
}

/**
 * Returns a single product by UUID, or null if not found.
 */
export async function getProductById(id: string): Promise<Product | null> {
	const rows = await db.select().from(products).where(eq(products.id, id)).limit(1);
	return rows[0] ?? null;
}

/**
 * Inserts a new product record.
 */
export async function insertProduct(data: NewProduct): Promise<Product> {
	const rows = await db.insert(products).values(data).returning();
	return rows[0];
}

/**
 * Updates an existing product record by UUID.
 */
export async function updateProduct(id: string, data: Partial<NewProduct>): Promise<Product> {
	const rows = await db
		.update(products)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(products.id, id))
		.returning();

	if (!rows[0]) throw new Error(`Product ${id} not found`);
	return rows[0];
}

/**
 * Marks a product as archived (soft delete). Archived products are excluded
 * from active inventory views by default.
 */
export async function archiveProduct(id: string): Promise<void> {
	await db
		.update(products)
		.set({ isArchived: true, updatedAt: new Date() })
		.where(eq(products.id, id));
}

/**
 * Returns all products whose current quantity is at or below their
 * individual low-stock threshold.
 */
export async function getLowStockProducts(): Promise<Product[]> {
	return db
		.select()
		.from(products)
		.where(
			and(
				eq(products.isArchived, false),
				lte(products.quantity, products.lowStockThreshold)
			)
		)
		.orderBy(products.quantity);
}

/**
 * Returns active products with no Stock-Out or Sale movement within the
 * given number of days (dead stock).
 */
export async function getDeadStockProducts(days: number): Promise<Product[]> {
	const cutoff = new Date();
	cutoff.setDate(cutoff.getDate() - days);

	// Run two separate queries to find recently active product IDs
	const [recentStockOut, recentSales] = await Promise.all([
		db
			.selectDistinct({ productId: stockOut.productId })
			.from(stockOut)
			.where(gte(stockOut.date, cutoff)),
		db
			.selectDistinct({ productId: sales.productId })
			.from(sales)
			.where(gte(sales.date, cutoff))
	]);

	// Merge into a unique set of active product IDs
	const activeSet = new Set([
		...recentStockOut.map((r) => r.productId),
		...recentSales.map((r) => r.productId)
	]);
	const activeProductIds = Array.from(activeSet);

	// Return non-archived products not in the active set
	if (activeProductIds.length === 0) {
		return db
			.select()
			.from(products)
			.where(eq(products.isArchived, false))
			.orderBy(products.brand);
	}

	return db
		.select()
		.from(products)
		.where(
			and(
				eq(products.isArchived, false),
				notInArray(products.id, activeProductIds)
			)
		)
		.orderBy(products.brand);
}

// ─── Analytics ────────────────────────────────────────────────────────────────

export interface InventoryValueItem {
	productId: string;
	brand: string;
	size: string;
	pattern: string;
	quantity: number;
	costPrice: number;
	inventoryValue: number;
}

export interface InventoryValueReport {
	items: InventoryValueItem[];
	totalValue: number;
}

/**
 * Computes inventory value (quantity × costPrice) per active product and
 * returns the line items plus a grand total.
 */
export async function getInventoryValueReport(): Promise<InventoryValueReport> {
	const rows = await db
		.select({
			id: products.id,
			brand: products.brand,
			size: products.size,
			pattern: products.pattern,
			quantity: products.quantity,
			costPrice: products.costPrice
		})
		.from(products)
		.where(eq(products.isArchived, false))
		.orderBy(products.brand);

	const items: InventoryValueItem[] = rows.map((r) => {
		const qty = r.quantity;
		const cost = Number(r.costPrice);
		return {
			productId: r.id,
			brand: r.brand,
			size: r.size,
			pattern: r.pattern,
			quantity: qty,
			costPrice: cost,
			inventoryValue: qty * cost
		};
	});

	const totalValue = items.reduce((sum, item) => sum + item.inventoryValue, 0);

	return { items, totalValue };
}
