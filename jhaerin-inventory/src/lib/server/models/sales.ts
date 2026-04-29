import { eq, and, gte, lte, ilike, or, desc, sum, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { sales, products, stockIn, stockOut } from '$lib/server/db/schema';
import type { Sale, NewSale } from '$lib/server/db/schema';

// ─── Filter & summary types ───────────────────────────────────────────────────

export interface SaleFilters {
	search?: string;       // matches product brand, size, or pattern
	productId?: string;
	from?: Date;
	to?: Date;
	limit?: number;
	offset?: number;
}

export interface DateRange {
	from?: Date;
	to?: Date;
}

export interface SalesSummary {
	totalRevenue: number;
	totalCost: number;
	totalGrossProfit: number;
	totalQuantitySold: number;
}

// ─── Transaction type alias ───────────────────────────────────────────────────

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

// ─── Sale queries ─────────────────────────────────────────────────────────────

/**
 * Inserts a new sale record inside a transaction.
 */
export async function insertSale(tx: Tx, data: NewSale): Promise<Sale> {
	const rows = await tx.insert(sales).values(data).returning();
	return rows[0];
}

/**
 * Updates an existing sale record inside a transaction.
 */
export async function updateSale(tx: Tx, id: string, data: Partial<NewSale>): Promise<Sale> {
	const rows = await tx
		.update(sales)
		.set(data)
		.where(eq(sales.id, id))
		.returning();

	if (!rows[0]) throw new Error(`Sale record ${id} not found`);
	return rows[0];
}

/**
 * Deletes a sale record inside a transaction.
 */
export async function deleteSale(tx: Tx, id: string): Promise<void> {
	await tx.delete(sales).where(eq(sales.id, id));
}

/**
 * Returns a paginated, filterable list of sales records joined with product info.
 */
export async function getSales(filters: SaleFilters = {}): Promise<(Sale & { brand: string; size: string; pattern: string })[]> {
	const { search, productId, from, to, limit = 50, offset = 0 } = filters;

	const conditions = [];

	if (productId) {
		conditions.push(eq(sales.productId, productId));
	}
	if (from) conditions.push(gte(sales.date, from));
	if (to) conditions.push(lte(sales.date, to));

	// For search we need to join products
	const rows = await db
		.select({
			id: sales.id,
			productId: sales.productId,
			quantitySold: sales.quantitySold,
			revenue: sales.revenue,
			cost: sales.cost,
			grossProfit: sales.grossProfit,
			date: sales.date,
			createdAt: sales.createdAt,
			brand: products.brand,
			size: products.size,
			pattern: products.pattern
		})
		.from(sales)
		.innerJoin(products, eq(sales.productId, products.id))
		.where(
			conditions.length
				? and(
						...conditions,
						search
							? or(
									ilike(products.brand, `%${search}%`),
									ilike(products.size, `%${search}%`),
									ilike(products.pattern, `%${search}%`)
								)
							: undefined
					)
				: search
					? or(
							ilike(products.brand, `%${search}%`),
							ilike(products.size, `%${search}%`),
							ilike(products.pattern, `%${search}%`)
						)
					: undefined
		)
		.orderBy(desc(sales.date))
		.limit(limit)
		.offset(offset);

	return rows;
}

/**
 * Returns aggregated revenue, cost, gross profit, and quantity sold
 * for a given date range.
 */
export async function getSalesSummary(dateRange: DateRange = {}): Promise<SalesSummary> {
	const { from, to } = dateRange;

	const conditions = [];
	if (from) conditions.push(gte(sales.date, from));
	if (to) conditions.push(lte(sales.date, to));

	const rows = await db
		.select({
			totalRevenue: sum(sales.revenue),
			totalCost: sum(sales.cost),
			totalGrossProfit: sum(sales.grossProfit),
			totalQuantitySold: sum(sales.quantitySold)
		})
		.from(sales)
		.where(conditions.length ? and(...conditions) : undefined);

	const row = rows[0];
	return {
		totalRevenue: Number(row?.totalRevenue ?? 0),
		totalCost: Number(row?.totalCost ?? 0),
		totalGrossProfit: Number(row?.totalGrossProfit ?? 0),
		totalQuantitySold: Number(row?.totalQuantitySold ?? 0)
	};
}

// ─── Dashboard aggregation ────────────────────────────────────────────────────

export interface DashboardKPIs {
	totalProducts: number;
	totalStock: number;
	stockInSummary: number;
	stockOutSummary: number;
	totalRevenue: number;
	totalGrossProfit: number;
}

export interface ChartDataPoint {
	label: string;
	value: number;
}

export interface TrendDataPoint {
	label: string;
	revenue: number;
	grossProfit: number;
}

export interface CategoryDataPoint {
	category: string;
	value: number;
}

/**
 * Returns KPI summary for the dashboard: product count, aggregate stock,
 * stock-in/out totals, revenue, and gross profit for the selected date range.
 */
export async function getDashboardKPIs(dateRange: DateRange = {}): Promise<DashboardKPIs> {
	const { from, to } = dateRange;

	const conditions: ReturnType<typeof gte>[] = [];
	if (from) conditions.push(gte(sales.date, from));
	if (to) conditions.push(lte(sales.date, to));

	// Product count and aggregate stock
	const productStats = await db
		.select({
			totalProducts: sql<number>`count(*)::int`,
			totalStock: sql<number>`coalesce(sum(${products.quantity}), 0)::int`
		})
		.from(products)
		.where(eq(products.isArchived, false));

	// Stock-In total for date range
	const stockInStats = await db
		.select({ total: sql<number>`coalesce(sum(${stockIn.quantity}), 0)::int` })
		.from(stockIn)
		.where(
			conditions.length
				? and(
						from ? gte(stockIn.date, from) : undefined,
						to ? lte(stockIn.date, to) : undefined
					)
				: undefined
		);

	// Stock-Out total for date range
	const stockOutStats = await db
		.select({ total: sql<number>`coalesce(sum(${stockOut.quantity}), 0)::int` })
		.from(stockOut)
		.where(
			conditions.length
				? and(
						from ? gte(stockOut.date, from) : undefined,
						to ? lte(stockOut.date, to) : undefined
					)
				: undefined
		);

	// Revenue and gross profit
	const salesStats = await db
		.select({
			totalRevenue: sql<number>`coalesce(sum(${sales.revenue}), 0)`,
			totalGrossProfit: sql<number>`coalesce(sum(${sales.grossProfit}), 0)`
		})
		.from(sales)
		.where(conditions.length ? and(...conditions) : undefined);

	return {
		totalProducts: productStats[0]?.totalProducts ?? 0,
		totalStock: productStats[0]?.totalStock ?? 0,
		stockInSummary: stockInStats[0]?.total ?? 0,
		stockOutSummary: stockOutStats[0]?.total ?? 0,
		totalRevenue: Number(salesStats[0]?.totalRevenue ?? 0),
		totalGrossProfit: Number(salesStats[0]?.totalGrossProfit ?? 0)
	};
}

/**
 * Returns the peak (highest revenue) and lowest (lowest revenue) sales month
 * for a given year.
 */
export async function getPeakAndLowestSalesMonth(
	year: number
): Promise<{ peak: string; lowest: string }> {
	const rows = await db
		.select({
			month: sql<string>`to_char(${sales.date}, 'Month YYYY')`,
			revenue: sql<number>`sum(${sales.revenue})`
		})
		.from(sales)
		.where(sql`extract(year from ${sales.date}) = ${year}`)
		.groupBy(sql`to_char(${sales.date}, 'Month YYYY'), extract(month from ${sales.date})`)
		.orderBy(sql`extract(month from ${sales.date})`);

	if (rows.length === 0) return { peak: '—', lowest: '—' };

	const sorted = [...rows].sort((a, b) => Number(b.revenue) - Number(a.revenue));
	return {
		peak: sorted[0].month.trim(),
		lowest: sorted[sorted.length - 1].month.trim()
	};
}

/**
 * Returns sales volume data points for a bar chart, grouped by the given
 * granularity: 'daily', 'weekly', or 'monthly'.
 */
export async function getSalesChartData(
	granularity: 'daily' | 'weekly' | 'monthly',
	dateRange: DateRange = {}
): Promise<ChartDataPoint[]> {
	const { from, to } = dateRange;

	const formatMap = {
		daily: 'YYYY-MM-DD',
		weekly: 'IYYY-IW',
		monthly: 'Mon YYYY'
	};

	const conditions = [];
	if (from) conditions.push(gte(sales.date, from));
	if (to) conditions.push(lte(sales.date, to));

	const rows = await db
		.select({
			label: sql<string>`to_char(${sales.date}, ${sql.raw(`'${formatMap[granularity]}'`)})`,
			value: sql<number>`sum(${sales.quantitySold})::int`
		})
		.from(sales)
		.where(conditions.length ? and(...conditions) : undefined)
		.groupBy(sql`to_char(${sales.date}, ${sql.raw(`'${formatMap[granularity]}'`)})`)
		.orderBy(sql`to_char(${sales.date}, ${sql.raw(`'${formatMap[granularity]}'`)})`);

	return rows.map((r) => ({ label: r.label, value: Number(r.value) }));
}

/**
 * Returns revenue and gross profit trend data points for a line chart.
 */
export async function getRevenueProfitTrend(dateRange: DateRange = {}): Promise<TrendDataPoint[]> {
	const { from, to } = dateRange;

	const conditions = [];
	if (from) conditions.push(gte(sales.date, from));
	if (to) conditions.push(lte(sales.date, to));

	const rows = await db
		.select({
			label: sql<string>`to_char(${sales.date}, 'Mon YYYY')`,
			revenue: sql<number>`sum(${sales.revenue})`,
			grossProfit: sql<number>`sum(${sales.grossProfit})`
		})
		.from(sales)
		.where(conditions.length ? and(...conditions) : undefined)
		.groupBy(sql`to_char(${sales.date}, 'Mon YYYY'), extract(year from ${sales.date}), extract(month from ${sales.date})`)
		.orderBy(sql`extract(year from ${sales.date}), extract(month from ${sales.date})`);

	return rows.map((r) => ({
		label: r.label,
		revenue: Number(r.revenue),
		grossProfit: Number(r.grossProfit)
	}));
}

/**
 * Returns sales breakdown by product brand for a pie/donut chart.
 */
export async function getSalesByCategory(dateRange: DateRange = {}): Promise<CategoryDataPoint[]> {
	const { from, to } = dateRange;

	const conditions = [];
	if (from) conditions.push(gte(sales.date, from));
	if (to) conditions.push(lte(sales.date, to));

	const rows = await db
		.select({
			category: products.brand,
			value: sql<number>`sum(${sales.quantitySold})::int`
		})
		.from(sales)
		.innerJoin(products, eq(sales.productId, products.id))
		.where(conditions.length ? and(...conditions) : undefined)
		.groupBy(products.brand)
		.orderBy(sql`sum(${sales.quantitySold}) desc`);

	return rows.map((r) => ({ category: r.category, value: Number(r.value) }));
}

// ─── Analytics & Reporting ────────────────────────────────────────────────────

export interface ProductSalesRank {
	productId: string;
	brand: string;
	size: string;
	pattern: string;
	totalQuantitySold: number;
	totalRevenue: number;
}

export interface PeriodSummary {
	period: string;
	totalRevenue: number;
	totalCost: number;
	totalGrossProfit: number;
	profitMarginPercent: number;
}

/**
 * Returns the top-selling products ranked by total quantity sold descending.
 */
export async function getTopSellingProducts(
	dateRange: DateRange = {},
	limit = 10
): Promise<ProductSalesRank[]> {
	const { from, to } = dateRange;
	const conditions = [];
	if (from) conditions.push(gte(sales.date, from));
	if (to) conditions.push(lte(sales.date, to));

	const rows = await db
		.select({
			productId: sales.productId,
			brand: products.brand,
			size: products.size,
			pattern: products.pattern,
			totalQuantitySold: sql<number>`sum(${sales.quantitySold})::int`,
			totalRevenue: sql<number>`sum(${sales.revenue})`
		})
		.from(sales)
		.innerJoin(products, eq(sales.productId, products.id))
		.where(conditions.length ? and(...conditions) : undefined)
		.groupBy(sales.productId, products.brand, products.size, products.pattern)
		.orderBy(sql`sum(${sales.quantitySold}) desc`)
		.limit(limit);

	return rows.map((r) => ({
		productId: r.productId,
		brand: r.brand,
		size: r.size,
		pattern: r.pattern,
		totalQuantitySold: Number(r.totalQuantitySold),
		totalRevenue: Number(r.totalRevenue)
	}));
}

/**
 * Returns the least-selling products ranked by total quantity sold ascending.
 */
export async function getLeastSellingProducts(
	dateRange: DateRange = {},
	limit = 10
): Promise<ProductSalesRank[]> {
	const { from, to } = dateRange;
	const conditions = [];
	if (from) conditions.push(gte(sales.date, from));
	if (to) conditions.push(lte(sales.date, to));

	const rows = await db
		.select({
			productId: sales.productId,
			brand: products.brand,
			size: products.size,
			pattern: products.pattern,
			totalQuantitySold: sql<number>`sum(${sales.quantitySold})::int`,
			totalRevenue: sql<number>`sum(${sales.revenue})`
		})
		.from(sales)
		.innerJoin(products, eq(sales.productId, products.id))
		.where(conditions.length ? and(...conditions) : undefined)
		.groupBy(sales.productId, products.brand, products.size, products.pattern)
		.orderBy(sql`sum(${sales.quantitySold}) asc`)
		.limit(limit);

	return rows.map((r) => ({
		productId: r.productId,
		brand: r.brand,
		size: r.size,
		pattern: r.pattern,
		totalQuantitySold: Number(r.totalQuantitySold),
		totalRevenue: Number(r.totalRevenue)
	}));
}

/**
 * Returns revenue and profit aggregated by the given granularity for a date range.
 */
export async function getRevenueAndProfitByPeriod(
	dateRange: DateRange = {},
	granularity: 'daily' | 'weekly' | 'monthly' = 'monthly'
): Promise<PeriodSummary[]> {
	const { from, to } = dateRange;
	const conditions = [];
	if (from) conditions.push(gte(sales.date, from));
	if (to) conditions.push(lte(sales.date, to));

	const formatMap = {
		daily: 'YYYY-MM-DD',
		weekly: 'IYYY-IW',
		monthly: 'Mon YYYY'
	};

	const rows = await db
		.select({
			period: sql<string>`to_char(${sales.date}, ${sql.raw(`'${formatMap[granularity]}'`)})`,
			totalRevenue: sql<number>`sum(${sales.revenue})`,
			totalCost: sql<number>`sum(${sales.cost})`,
			totalGrossProfit: sql<number>`sum(${sales.grossProfit})`
		})
		.from(sales)
		.where(conditions.length ? and(...conditions) : undefined)
		.groupBy(sql`to_char(${sales.date}, ${sql.raw(`'${formatMap[granularity]}'`)})`)
		.orderBy(sql`to_char(${sales.date}, ${sql.raw(`'${formatMap[granularity]}'`)})`);

	return rows.map((r) => {
		const rev = Number(r.totalRevenue);
		const profit = Number(r.totalGrossProfit);
		return {
			period: r.period,
			totalRevenue: rev,
			totalCost: Number(r.totalCost),
			totalGrossProfit: profit,
			profitMarginPercent: rev > 0 ? (profit / rev) * 100 : 0
		};
	});
}

// ─── Financial Analytics ──────────────────────────────────────────────────────

export interface MonthlyFinancialSummary {
	month: string;
	totalRevenue: number;
	totalCost: number;
	totalGrossProfit: number;
	profitMarginPercent: number;
}

export interface ForecastPoint {
	period: string;
	forecastedQty: number;
}

/**
 * Returns monthly financial summary (revenue, cost, gross profit, margin %)
 * for each month in the selected date range.
 */
export async function getMonthlyFinancialSummary(
	dateRange: DateRange = {}
): Promise<MonthlyFinancialSummary[]> {
	const { from, to } = dateRange;
	const conditions = [];
	if (from) conditions.push(gte(sales.date, from));
	if (to) conditions.push(lte(sales.date, to));

	const rows = await db
		.select({
			month: sql<string>`to_char(${sales.date}, 'Mon YYYY')`,
			sortKey: sql<string>`to_char(${sales.date}, 'YYYY-MM')`,
			totalRevenue: sql<number>`sum(${sales.revenue})`,
			totalCost: sql<number>`sum(${sales.cost})`,
			totalGrossProfit: sql<number>`sum(${sales.grossProfit})`
		})
		.from(sales)
		.where(conditions.length ? and(...conditions) : undefined)
		.groupBy(
			sql`to_char(${sales.date}, 'Mon YYYY')`,
			sql`to_char(${sales.date}, 'YYYY-MM')`
		)
		.orderBy(sql`to_char(${sales.date}, 'YYYY-MM')`);

	return rows.map((r) => {
		const rev = Number(r.totalRevenue);
		const profit = Number(r.totalGrossProfit);
		return {
			month: r.month,
			totalRevenue: rev,
			totalCost: Number(r.totalCost),
			totalGrossProfit: profit,
			profitMarginPercent: rev > 0 ? (profit / rev) * 100 : 0
		};
	});
}

/**
 * Generates a simple linear-trend sales forecast for a product.
 * Uses the last `lookbackMonths` months of data to project `periods` future months.
 *
 * The linear regression formula: y = a + b*x where x is the month index.
 */
export async function getSalesForecast(
	productId: string,
	periods = 3,
	lookbackMonths = 6
): Promise<ForecastPoint[]> {
	const cutoff = new Date();
	cutoff.setMonth(cutoff.getMonth() - lookbackMonths);

	const rows = await db
		.select({
			month: sql<string>`to_char(${sales.date}, 'YYYY-MM')`,
			qty: sql<number>`sum(${sales.quantitySold})::int`
		})
		.from(sales)
		.where(
			and(
				eq(sales.productId, productId),
				gte(sales.date, cutoff)
			)
		)
		.groupBy(sql`to_char(${sales.date}, 'YYYY-MM')`)
		.orderBy(sql`to_char(${sales.date}, 'YYYY-MM')`);

	if (rows.length < 2) {
		// Not enough data — return flat forecast based on average
		const avg = rows.length === 1 ? Number(rows[0].qty) : 0;
		return Array.from({ length: periods }, (_, i) => {
			const d = new Date();
			d.setMonth(d.getMonth() + i + 1);
			return {
				period: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
				forecastedQty: Math.round(avg)
			};
		});
	}

	// Simple linear regression: y = a + b*x
	const n = rows.length;
	const xs = rows.map((_, i) => i);
	const ys = rows.map((r) => Number(r.qty));
	const sumX = xs.reduce((s, x) => s + x, 0);
	const sumY = ys.reduce((s, y) => s + y, 0);
	const sumXY = xs.reduce((s, x, i) => s + x * ys[i], 0);
	const sumX2 = xs.reduce((s, x) => s + x * x, 0);
	const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
	const a = (sumY - b * sumX) / n;

	return Array.from({ length: periods }, (_, i) => {
		const x = n + i;
		const forecastedQty = Math.max(0, Math.round(a + b * x));
		const d = new Date();
		d.setMonth(d.getMonth() + i + 1);
		return {
			period: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
			forecastedQty
		};
	});
}
