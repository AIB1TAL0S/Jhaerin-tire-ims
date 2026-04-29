import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { stockIn, stockOut, products } from '$lib/server/db/schema';
import type { StockIn, NewStockIn, StockOut, NewStockOut } from '$lib/server/db/schema';

// ─── Filter types ─────────────────────────────────────────────────────────────

export interface StockFilters {
	productId?: string;
	from?: Date;
	to?: Date;
	limit?: number;
	offset?: number;
}

// ─── Shared helper ────────────────────────────────────────────────────────────

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Atomically adjusts a product's quantity by `delta` (positive = add, negative = subtract).
 * Must be called inside a Drizzle transaction.
 */
export async function adjustProductQuantity(tx: Tx, productId: string, delta: number): Promise<void> {
	await tx
		.update(products)
		.set({
			quantity: sql`${products.quantity} + ${delta}`,
			updatedAt: new Date()
		})
		.where(eq(products.id, productId));
}

// ─── Stock-In ─────────────────────────────────────────────────────────────────

/**
 * Inserts a Stock-In record inside a transaction.
 */
export async function insertStockIn(tx: Tx, data: NewStockIn): Promise<StockIn> {
	const rows = await tx.insert(stockIn).values(data).returning();
	return rows[0];
}

/**
 * Updates a Stock-In record and recalculates the product quantity delta.
 * The caller is responsible for reversing the old delta before applying the new one.
 */
export async function updateStockIn(tx: Tx, id: string, data: Partial<NewStockIn>): Promise<StockIn> {
	const rows = await tx
		.update(stockIn)
		.set(data)
		.where(eq(stockIn.id, id))
		.returning();

	if (!rows[0]) throw new Error(`StockIn record ${id} not found`);
	return rows[0];
}

/**
 * Deletes a Stock-In record inside a transaction.
 */
export async function deleteStockIn(tx: Tx, id: string): Promise<void> {
	await tx.delete(stockIn).where(eq(stockIn.id, id));
}

/**
 * Returns a paginated, optionally filtered list of Stock-In records.
 */
export async function getStockIn(filters: StockFilters = {}): Promise<StockIn[]> {
	const { productId, from, to, limit = 50, offset = 0 } = filters;

	const conditions = [];
	if (productId) conditions.push(eq(stockIn.productId, productId));
	if (from) conditions.push(gte(stockIn.date, from));
	if (to) conditions.push(lte(stockIn.date, to));

	return db
		.select()
		.from(stockIn)
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(desc(stockIn.date))
		.limit(limit)
		.offset(offset);
}

// ─── Stock-Out ────────────────────────────────────────────────────────────────

/**
 * Inserts a Stock-Out record inside a transaction.
 * Validates that the quantity does not exceed the product's current stock.
 */
export async function insertStockOut(tx: Tx, data: NewStockOut): Promise<StockOut> {
	// Guard: check current quantity before inserting
	const productRows = await tx
		.select({ quantity: products.quantity })
		.from(products)
		.where(eq(products.id, data.productId))
		.limit(1);

	const current = productRows[0]?.quantity ?? 0;
	if (data.quantity > current) {
		throw new Error(
			`Insufficient stock: requested ${data.quantity} but only ${current} available.`
		);
	}

	const rows = await tx.insert(stockOut).values(data).returning();
	return rows[0];
}

/**
 * Updates a Stock-Out record inside a transaction.
 * Reverses the old quantity delta and applies the new one atomically.
 */
export async function updateStockOut(tx: Tx, id: string, data: Partial<NewStockOut>): Promise<StockOut> {
	// Fetch the existing record to compute the delta reversal
	const existing = await tx
		.select()
		.from(stockOut)
		.where(eq(stockOut.id, id))
		.limit(1);

	if (!existing[0]) throw new Error(`StockOut record ${id} not found`);

	const oldQty = existing[0].quantity;
	const newQty = data.quantity ?? oldQty;
	const productId = data.productId ?? existing[0].productId;

	// Validate the new quantity won't exceed available stock
	// (restore old qty first conceptually, then check new qty)
	const productRows = await tx
		.select({ quantity: products.quantity })
		.from(products)
		.where(eq(products.id, productId))
		.limit(1);

	const currentQty = productRows[0]?.quantity ?? 0;
	const availableAfterReversal = currentQty + oldQty;

	if (newQty > availableAfterReversal) {
		throw new Error(
			`Insufficient stock: requested ${newQty} but only ${availableAfterReversal} available after reversal.`
		);
	}

	// Apply delta: reverse old, apply new
	const delta = oldQty - newQty; // positive = net restore, negative = net deduction
	await adjustProductQuantity(tx, productId, delta);

	const rows = await tx.update(stockOut).set(data).where(eq(stockOut.id, id)).returning();
	return rows[0];
}

/**
 * Deletes a Stock-Out record and restores the product quantity inside a transaction.
 */
export async function deleteStockOut(tx: Tx, id: string): Promise<void> {
	const existing = await tx
		.select({ quantity: stockOut.quantity, productId: stockOut.productId })
		.from(stockOut)
		.where(eq(stockOut.id, id))
		.limit(1);

	if (!existing[0]) throw new Error(`StockOut record ${id} not found`);

	// Restore the quantity before deleting
	await adjustProductQuantity(tx, existing[0].productId, existing[0].quantity);
	await tx.delete(stockOut).where(eq(stockOut.id, id));
}

/**
 * Returns a paginated, optionally filtered list of Stock-Out records.
 */
export async function getStockOut(filters: StockFilters = {}): Promise<StockOut[]> {
	const { productId, from, to, limit = 50, offset = 0 } = filters;

	const conditions = [];
	if (productId) conditions.push(eq(stockOut.productId, productId));
	if (from) conditions.push(gte(stockOut.date, from));
	if (to) conditions.push(lte(stockOut.date, to));

	return db
		.select()
		.from(stockOut)
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(desc(stockOut.date))
		.limit(limit)
		.offset(offset);
}
