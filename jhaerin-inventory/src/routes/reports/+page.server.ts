import { fail } from '@sveltejs/kit';
import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import {
	getTopSellingProducts,
	getLeastSellingProducts,
	getRevenueAndProfitByPeriod,
	getSalesChartData
} from '$lib/server/models/sales';
import { getInventoryValueReport } from '$lib/server/models/inventory';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const from = url.searchParams.get('from')
		? new Date(url.searchParams.get('from')!)
		: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
	const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to')!) : new Date();
	const granularity = (url.searchParams.get('granularity') ?? 'monthly') as
		| 'daily'
		| 'weekly'
		| 'monthly';
	const dateRange = { from, to };

	const [topSelling, leastSelling, inventoryValue, periodSummary, chartData] = await Promise.all([
		getTopSellingProducts(dateRange, 10),
		getLeastSellingProducts(dateRange, 10),
		getInventoryValueReport(),
		getRevenueAndProfitByPeriod(dateRange, granularity),
		getSalesChartData(granularity, dateRange)
	]);

	return {
		topSelling,
		leastSelling,
		inventoryValue,
		periodSummary,
		chartData,
		granularity,
		from: from.toISOString().split('T')[0],
		to: to.toISOString().split('T')[0]
	};
};

export const actions: Actions = {
	/**
	 * Generates a simple CSV-based "PDF" report, uploads it to Supabase Storage,
	 * and returns a signed download URL valid for 1 hour.
	 *
	 * Note: Full PDF generation (e.g. via Puppeteer) requires a Node.js runtime.
	 * On Cloudflare Workers we generate a CSV and store it as a downloadable report.
	 */
	exportPdf: async ({ request, locals }) => {
		const formData = await request.formData();
		const from = formData.get('from')?.toString() ?? '';
		const to = formData.get('to')?.toString() ?? '';
		const reportType = formData.get('reportType')?.toString() ?? 'summary';

		const dateRange = {
			from: from ? new Date(from) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
			to: to ? new Date(to) : new Date()
		};

		try {
			// Fetch report data
			const [topSelling, inventoryValue, periodSummary] = await Promise.all([
				getTopSellingProducts(dateRange, 20),
				getInventoryValueReport(),
				getRevenueAndProfitByPeriod(dateRange, 'monthly')
			]);

			// Build CSV content
			let csv = `Jhaerin Tire Supply — Report\nGenerated: ${new Date().toISOString()}\nPeriod: ${from} to ${to}\n\n`;

			if (reportType === 'summary' || reportType === 'sales') {
				csv += 'TOP SELLING PRODUCTS\n';
				csv += 'Brand,Size,Pattern,Qty Sold,Revenue\n';
				topSelling.forEach((p) => {
					csv += `"${p.brand}","${p.size}","${p.pattern}",${p.totalQuantitySold},${p.totalRevenue}\n`;
				});
				csv += '\nREVENUE & PROFIT BY PERIOD\n';
				csv += 'Period,Revenue,Cost,Gross Profit,Margin %\n';
				periodSummary.forEach((p) => {
					csv += `"${p.period}",${p.totalRevenue},${p.totalCost},${p.totalGrossProfit},${p.profitMarginPercent.toFixed(2)}\n`;
				});
			}

			if (reportType === 'summary' || reportType === 'inventory') {
				csv += '\nINVENTORY VALUE\n';
				csv += 'Brand,Size,Pattern,Qty,Cost Price,Value\n';
				inventoryValue.items.forEach((item) => {
					csv += `"${item.brand}","${item.size}","${item.pattern}",${item.quantity},${item.costPrice},${item.inventoryValue}\n`;
				});
				csv += `\nTotal Inventory Value,,,,,${inventoryValue.totalValue}\n`;
			}

			// Upload to Supabase Storage
			const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
				auth: { autoRefreshToken: false, persistSession: false }
			});

			const fileName = `reports/report-${reportType}-${Date.now()}.csv`;
			const { error: uploadError } = await supabase.storage
				.from('reports')
				.upload(fileName, new Blob([csv], { type: 'text/csv' }), {
					contentType: 'text/csv',
					upsert: false
				});

			if (uploadError) {
				return fail(500, { error: `Upload failed: ${uploadError.message}` });
			}

			// Generate signed URL valid for 1 hour
			const { data: signedData, error: signError } = await supabase.storage
				.from('reports')
				.createSignedUrl(fileName, 3600);

			if (signError || !signedData) {
				return fail(500, { error: 'Failed to generate download link.' });
			}

			return { downloadUrl: signedData.signedUrl, fileName };
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Export failed.';
			return fail(500, { error: msg });
		}
	}
};
