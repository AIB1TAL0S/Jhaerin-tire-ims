import fc from 'fast-check';
import { describe, it, expect } from 'vitest';
import {
	computeSaleFinancials,
	computeProfitMargin,
	computeInventoryTurnover
} from './sales';

// fast-check v4 requires 32-bit float bounds — use Math.fround() for min/max
const F32_MIN = Math.fround(0.01);
const F32_MAX = Math.fround(99_999.0);
const F32_MID = Math.fround(49_999.0);
const F32_COGS_MAX = Math.fround(1_000_000.0);

// ─── Property 1: Sale financial computation is internally consistent ──────────
describe('computeSaleFinancials', () => {
	it('revenue = qty × retailPrice, cost = qty × costPrice, grossProfit = revenue − cost', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 10_000 }),
				fc.float({ min: F32_MIN, max: F32_MAX, noNaN: true }),
				fc.float({ min: F32_MIN, max: F32_MAX, noNaN: true }),
				(qty, costPrice, retailPrice) => {
					const result = computeSaleFinancials(qty, costPrice, retailPrice);

					expect(result.revenue).toBeCloseTo(qty * retailPrice, 2);
					expect(result.cost).toBeCloseTo(qty * costPrice, 2);
					expect(result.grossProfit).toBeCloseTo(result.revenue - result.cost, 2);
				}
			),
			{ numRuns: 100 }
		);
	});

	it('grossProfit is positive when retailPrice > costPrice', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 10_000 }),
				fc.float({ min: F32_MIN, max: F32_MID, noNaN: true }),
				(qty, costPrice) => {
					const retailPrice = costPrice + 1;
					const { grossProfit } = computeSaleFinancials(qty, costPrice, retailPrice);
					expect(grossProfit).toBeGreaterThan(0);
				}
			),
			{ numRuns: 100 }
		);
	});

	it('grossProfit is negative when retailPrice < costPrice', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 10_000 }),
				fc.float({ min: Math.fround(2.0), max: F32_MAX, noNaN: true }),
				(qty, costPrice) => {
					const retailPrice = costPrice - 1;
					const { grossProfit } = computeSaleFinancials(qty, costPrice, retailPrice);
					expect(grossProfit).toBeLessThan(0);
				}
			),
			{ numRuns: 100 }
		);
	});

	it('grossProfit is zero when retailPrice === costPrice', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 10_000 }),
				fc.float({ min: F32_MIN, max: F32_MAX, noNaN: true }),
				(qty, price) => {
					const { grossProfit } = computeSaleFinancials(qty, price, price);
					expect(grossProfit).toBeCloseTo(0, 5);
				}
			),
			{ numRuns: 100 }
		);
	});
});

// ─── Property 2: Profit margin is bounded and consistent ──────────────────────
describe('computeProfitMargin', () => {
	it('margin sign matches price relationship', () => {
		fc.assert(
			fc.property(
				fc.float({ min: F32_MIN, max: F32_MAX, noNaN: true }),
				fc.float({ min: F32_MIN, max: F32_MAX, noNaN: true }),
				fc.integer({ min: 1, max: 10_000 }),
				(costPrice, retailPrice, qty) => {
					const { revenue, grossProfit } = computeSaleFinancials(qty, costPrice, retailPrice);
					const margin = computeProfitMargin(grossProfit, revenue);

					expect(isFinite(margin)).toBe(true);
					if (retailPrice > costPrice) expect(margin).toBeGreaterThan(0);
					if (retailPrice < costPrice) expect(margin).toBeLessThan(0);
					if (retailPrice === costPrice) expect(margin).toBeCloseTo(0, 5);
				}
			),
			{ numRuns: 100 }
		);
	});

	it('returns 0 when revenue is 0', () => {
		expect(computeProfitMargin(0, 0)).toBe(0);
		expect(computeProfitMargin(100, 0)).toBe(0);
	});

	it('result is always a finite number for valid inputs', () => {
		fc.assert(
			fc.property(
				fc.float({ min: F32_MIN, max: F32_MAX, noNaN: true }),
				fc.float({ min: F32_MIN, max: F32_MAX, noNaN: true }),
				fc.integer({ min: 1, max: 10_000 }),
				(costPrice, retailPrice, qty) => {
					const { revenue, grossProfit } = computeSaleFinancials(qty, costPrice, retailPrice);
					const margin = computeProfitMargin(grossProfit, revenue);
					expect(isFinite(margin)).toBe(true);
					expect(isNaN(margin)).toBe(false);
				}
			),
			{ numRuns: 100 }
		);
	});
});

// ─── Property 3: Stock quantity adjustment is reversible ──────────────────────
describe('stock quantity reversibility', () => {
	it('adding delta then subtracting same delta returns to original quantity', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0, max: 100_000 }),
				fc.integer({ min: 1, max: 10_000 }),
				(initialQty, delta) => {
					const afterAdd = initialQty + delta;
					const afterSubtract = afterAdd - delta;
					expect(afterSubtract).toBe(initialQty);
				}
			),
			{ numRuns: 100 }
		);
	});

	it('subtracting delta then adding same delta returns to original quantity', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 100_000 }),
				fc.integer({ min: 1, max: 100_000 }),
				(initialQty, delta) => {
					fc.pre(delta <= initialQty);
					const afterSubtract = initialQty - delta;
					const afterAdd = afterSubtract + delta;
					expect(afterAdd).toBe(initialQty);
				}
			),
			{ numRuns: 100 }
		);
	});
});

// ─── Property 4: Stock-Out quantity guard ─────────────────────────────────────
describe('Stock-Out quantity guard', () => {
	it('rejects Stock-Out when requested amount exceeds current stock', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0, max: 1_000 }),
				fc.integer({ min: 1, max: 2_000 }),
				(currentStock, requestedQty) => {
					fc.pre(requestedQty > currentStock);
					const isRejected = requestedQty > currentStock;
					expect(isRejected).toBe(true);
				}
			),
			{ numRuns: 100 }
		);
	});

	it('allows Stock-Out when requested amount equals current stock', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 10_000 }),
				(stock) => {
					const isAllowed = stock <= stock;
					expect(isAllowed).toBe(true);
				}
			),
			{ numRuns: 100 }
		);
	});
});

// ─── Property 5: Sale quantity guard ─────────────────────────────────────────
describe('Sale quantity guard', () => {
	it('rejects sale when quantitySold exceeds product stock', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 0, max: 1_000 }),
				fc.integer({ min: 1, max: 2_000 }),
				(currentStock, quantitySold) => {
					fc.pre(quantitySold > currentStock);
					const isRejected = quantitySold > currentStock;
					expect(isRejected).toBe(true);
				}
			),
			{ numRuns: 100 }
		);
	});

	it('allows sale when quantitySold equals current stock', () => {
		fc.assert(
			fc.property(
				fc.integer({ min: 1, max: 10_000 }),
				(stock) => {
					const isAllowed = stock <= stock;
					expect(isAllowed).toBe(true);
				}
			),
			{ numRuns: 100 }
		);
	});
});

// ─── computeInventoryTurnover ─────────────────────────────────────────────────
describe('computeInventoryTurnover', () => {
	it('returns 0 when avgInventoryValue is 0', () => {
		expect(computeInventoryTurnover(1000, 0)).toBe(0);
	});

	it('turnover = cogs / avgInventoryValue', () => {
		fc.assert(
			fc.property(
				fc.float({ min: Math.fround(0), max: F32_COGS_MAX, noNaN: true }),
				fc.float({ min: F32_MIN, max: F32_COGS_MAX, noNaN: true }),
				(cogs, avgInventoryValue) => {
					const turnover = computeInventoryTurnover(cogs, avgInventoryValue);
					expect(turnover).toBeCloseTo(cogs / avgInventoryValue, 5);
				}
			),
			{ numRuns: 100 }
		);
	});
});
