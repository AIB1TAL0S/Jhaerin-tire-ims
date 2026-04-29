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
	// Date range from query params (default: last 30 days)
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

	const [kpis, peakLowest, chartData, trendData, categoryData, lowStock, deadStock, unreadCount] =
		await Promise.all([
			getDashboardKPIs(dateRange),
			getPeakAndLowestSalesMonth(currentYear),
			getSalesChartData(granularity, dateRange),
			getRevenueProfitTrend(dateRange),
			getSalesByCategory(dateRange),
			getLowStockProducts(),
			getDeadStockProducts(90),
			locals.user ? getUnreadCount(locals.user.userId) : Promise.resolve(0)
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
		from: fromDate.toISOString().split('T')[0],
		to: toDate.toISOString().split('T')[0]
	};
};
