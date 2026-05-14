import type { PageServerLoad } from './$types';
import {
	getDashboardKPIs,
	getPeakAndLowestSalesMonth,
	getSalesChartData,
	getRevenueProfitTrend,
	getSalesByCategory
} from '$lib/server/models/sales';
import { getLowStockProducts, getDeadStockProducts } from '$lib/server/models/inventory';
import { getUnreadCount } from '$lib/server/models/notifications';

export const load: PageServerLoad = async ({ url, locals }) => {
	const canViewSalesMetrics = locals.user?.role === 'Owner';
	const toDate = url.searchParams.get('to')
		? new Date(url.searchParams.get('to')!)
		: new Date();
	const fromDate = url.searchParams.get('from')
		? new Date(url.searchParams.get('from')!)
		: new Date(toDate.getTime() - 30 * 24 * 60 * 60 * 1000);

	const granularity = (url.searchParams.get('granularity') ?? 'daily') as
		| 'daily'
		| 'weekly'
		| 'monthly';

	const dateRange = { from: fromDate, to: toDate };
	const currentYear = toDate.getFullYear();

	// Run queries in two smaller batches to avoid overwhelming the DB connection pool
	const [kpis, peakLowest, chartData] = await Promise.all([
		getDashboardKPIs(dateRange, canViewSalesMetrics).catch(() => ({
			totalProducts: 0,
			totalStock: 0,
			stockInSummary: 0,
			stockOutSummary: 0,
			totalRevenue: 0,
			totalGrossProfit: 0
		})),
		canViewSalesMetrics
			? getPeakAndLowestSalesMonth(currentYear).catch(() => ({ peak: '—', lowest: '—' }))
			: Promise.resolve({ peak: '—', lowest: '—' }),
		canViewSalesMetrics
			? getSalesChartData(granularity, dateRange).catch(() => [])
			: Promise.resolve([])
	]);

	const [trendData, categoryData, lowStock, deadStock, unreadCount] = await Promise.all([
		canViewSalesMetrics ? getRevenueProfitTrend(dateRange).catch(() => []) : Promise.resolve([]),
		canViewSalesMetrics ? getSalesByCategory(dateRange).catch(() => []) : Promise.resolve([]),
		getLowStockProducts().catch(() => []),
		getDeadStockProducts(90).catch(() => []),
		locals.user ? getUnreadCount(locals.user.userId).catch(() => 0) : Promise.resolve(0)
	]);

	return {
		kpis,
		peakLowest,
		chartData,
		trendData,
		categoryData,
		lowStock,
		deadStock,
		unreadCount,
		granularity,
		canViewSalesMetrics,
		from: fromDate.toISOString().split('T')[0],
		to: toDate.toISOString().split('T')[0]
	};
};
