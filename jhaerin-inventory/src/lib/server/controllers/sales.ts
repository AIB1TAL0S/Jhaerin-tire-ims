import { db } from '$lib/server/db';
import { products, sales } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { insertSale, updateSale, deleteSale } from '$lib/server/models/sales';
import { adjustProductQuantity } from '$lib/server/models/stock';
import type { Sale } from '$lib/server/db/schema';
import type { Result } from '$lib/utils/result';

// ─── Pure computation functions ───────────────────────────────────────────────

export interface SaleFinancials {
	revenue: number;
	cost: number;
	grossProfit: number;
}

/**
 * Computes revenue, cost, and gross profit for a sale.
 * Pure function — no database access.
 *
 * Property 1: revenue = qty × retailPrice, cost = qty × costPrice,
 *             grossProfit = revenue − cost
 */
export function computeSaleFinancials(
	quantitySold: number,
	costPrice: number,
	retailPrice: number
): SaleFinancials {
	const revenue = quantitySold * retailPrice;
	const cost = quantitySold * costPrice;
	const grossProfit = revenue - cost;
	return { revenue, cost, grossProfit };
}

/**
 * Computes profit margin percentage.
 * Pure function — no database access.
 *
 * Property 2: margin > 0 when retail > cost, < 0 when retail < cost, = 0 when equal.
 */
export function computeProfitMargin(grossProfit: number, revenue: number): number {
	if (revenue === 0) return 0;
	return (grossProfit / revenue) * 100;
}

/**
 * Computes inventory turnover ratio.
 * Pure function — no database access.
 */
export function computeInventoryTurnover(cogs: number, avgInventoryValue: number): number {
	if (avgInventoryValue === 0) return 0;
	return cogs / avgInventoryValue;
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateSaleInput {
	productId: string;
	quantitySold: number;
	date: Date;
}

export interface UpdateSaleInput {
	productId?: string;
	quantitySold?: number;
	date?: Date;
}

// ─── Controller functions ─────────────────────────────────────────────────────

/**
 * Creates a sale record.
 * - Validates quantitySold > 0 and quantitySold <= product.quantity
 * - Computes revenue, cost, grossProfit from product prices
 * - Atomically inserts the sale and decrements product quantity
 */
export async function createSale(input: CreateSaleInput): Promise<Result<Sale>> {
	if (input.quantitySold <= 0) {
		return { success: false, error: 'Quantity sold must be greater than zero.' };
	}

	// Fetch product for price data and stock check
	const productRows = await db
		.select()
		.from(products)
		.where(eq(products.id, input.productId))
		.limit(1);

	const product = productRows[0];
	if (!product) {
		return { success: false, error: 'Product not found.' };
	}

	// Property 5: sale quantity guard
	if (input.quantitySold > product.quantity) {
		return {
			success: false,
			error: `Insufficient stock: only ${product.quantity} unit(s) available.`
		};
	}

	const { revenue, cost, grossProfit } = computeSaleFinancials(
		input.quantitySold,
		Number(product.costPrice),
		Number(product.retailPrice)
	);

	try {
		const sale = await db.transaction(async (tx) => {
			const inserted = await insertSale(tx, {
				productId: input.productId,
				quantitySold: input.quantitySold,
				revenue: String(revenue),
				cost: String(cost),
				grossProfit: String(grossProfit),
				date: input.date
			});
			await adjustProductQuantity(tx, input.productId, -input.quantitySold);
			return inserted;
		});

		return { success: true, data: sale };
	} catch (err) {
		return { success: false, error: 'Failed to record sale. Please try again.' };
	}
}

/**
 * Updates a sale record.
 * - Recomputes financials based on updated quantity and current product prices
 * - Atomically adjusts product quantity by the delta (new qty − old qty)
 */
export async function updateSaleController(
	id: string,
	input: UpdateSaleInput
): Promise<Result<Sale>> {
	// Fetch existing sale
	const existingRows = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
	const existing = existingRows[0];
	if (!existing) {
		return { success: false, error: 'Sale record not found.' };
	}

	const productId = input.productId ?? existing.productId;
	const newQty = input.quantitySold ?? existing.quantitySold;

	if (newQty <= 0) {
		return { success: false, error: 'Quantity sold must be greater than zero.' };
	}

	// Fetch product for current prices and stock
	const productRows = await db.select().from(products).where(eq(products.id, productId)).limit(1);
	const product = productRows[0];
	if (!product) {
		return { success: false, error: 'Product not found.' };
	}

	// Available stock = current stock + old qty (reversal) − new qty
	const availableAfterReversal = product.quantity + existing.quantitySold;
	if (newQty > availableAfterReversal) {
		return {
			success: false,
			error: `Insufficient stock: only ${availableAfterReversal} unit(s) available after reversal.`
		};
	}

	const { revenue, cost, grossProfit } = computeSaleFinancials(
		newQty,
		Number(product.costPrice),
		Number(product.retailPrice)
	);

	const delta = existing.quantitySold - newQty; // positive = net restore

	try {
		const updated = await db.transaction(async (tx) => {
			const result = await updateSale(tx, id, {
				productId,
				quantitySold: newQty,
				revenue: String(revenue),
				cost: String(cost),
				grossProfit: String(grossProfit),
				date: input.date ?? existing.date
			});
			if (delta !== 0) {
				await adjustProductQuantity(tx, productId, delta);
			}
			return result;
		});

		return { success: true, data: updated };
	} catch (err) {
		return { success: false, error: 'Failed to update sale. Please try again.' };
	}
}

/**
 * Deletes a sale record and atomically restores the product quantity.
 */
export async function deleteSaleController(id: string): Promise<Result<void>> {
	const existingRows = await db.select().from(sales).where(eq(sales.id, id)).limit(1);
	const existing = existingRows[0];
	if (!existing) {
		return { success: false, error: 'Sale record not found.' };
	}

	try {
		await db.transaction(async (tx) => {
			await adjustProductQuantity(tx, existing.productId, existing.quantitySold);
			await deleteSale(tx, id);
		});

		return { success: true, data: undefined };
	} catch (err) {
		return { success: false, error: 'Failed to delete sale. Please try again.' };
	}
}
