import { error } from '@sveltejs/kit';
import {
	getMonthlyFinancialSummary,
	getSalesForecast,
	getRevenueProfitTrend
} from '$lib/server/models/sales';
import { getInventoryValueReport } from '$lib/server/models/inventory';
import { computeProfitMargin, computeInventoryTurnover } from '$lib/server/controllers/sales';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Owner-only guard (hooks.server.ts also enforces this)
	if (!locals.user || locals.user.role !== 'Owner') {
		error(403, 'Forbidden: Owner access required');
	}

	const from = url.searchParams.get('from')
		? new Date(url.searchParams.get('from')!)
		: new Date(new Date().getFullYear(), 0, 1); // default: start of current year
	const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to')!) : new Date();
	const forecastProductId = url.searchParams.get('forecastProduct') ?? null;
	const dateRange = { from, to };

	const [monthlySummary, trendData, inventoryValue] = await Promise.all([
		getMonthlyFinancialSummary(dateRange),
		getRevenueProfitTrend(dateRange),
		getInventoryValueReport()
	]);

	// Compute aggregate financials for the period
	const totalRevenue = monthlySummary.reduce((s, m) => s + m.totalRevenue, 0);
	const totalCost = monthlySummary.reduce((s, m) => s + m.totalCost, 0);
	const totalGrossProfit = monthlySummary.reduce((s, m) => s + m.totalGrossProfit, 0);
	const overallMargin = computeProfitMargin(totalGrossProfit, totalRevenue);

	// Inventory turnover: COGS / avg inventory value
	// avg inventory value approximated as current total inventory value
	const avgInventoryValue = inventoryValue.totalValue;
	const inventoryTurnover = computeInventoryTurnover(totalCost, avgInventoryValue);

	// Sales forecast for selected product (or null)
	const forecast = forecastProductId
		? await getSalesForecast(forecastProductId, 3)
		: null;

	return {
		monthlySummary,
		trendData,
		inventoryValue,
		totalRevenue,
		totalCost,
		totalGrossProfit,
		overallMargin,
		inventoryTurnover,
		forecast,
		forecastProductId,
		from: from.toISOString().split('T')[0],
		to: to.toISOString().split('T')[0]
	};
};
