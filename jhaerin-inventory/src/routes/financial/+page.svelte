<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import RevenueProfitAnalysisChart from '$lib/components/RevenueProfitAnalysisChart.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// ── Date range filter ────────────────────────────────────────────────────
	let fromFilter = $state(data.from);
	let toFilter = $state(data.to);

	function applyFilters() {
		const url = new URL($page.url);
		if (fromFilter) url.searchParams.set('from', fromFilter);
		else url.searchParams.delete('from');
		if (toFilter) url.searchParams.set('to', toFilter);
		else url.searchParams.delete('to');
		goto(url.toString(), { replaceState: true });
	}

	// ── Period filter modal ──────────────────────────────────────────────────
	let filterOpen = $state(false);

	// ── Forecast product selector ────────────────────────────────────────────
	let forecastProductId = $state(data.forecastProductId ?? '');

	function applyForecast() {
		const url = new URL($page.url);
		if (forecastProductId) url.searchParams.set('forecastProduct', forecastProductId);
		else url.searchParams.delete('forecastProduct');
		goto(url.toString(), { replaceState: true });
	}

	// ── Helpers ──────────────────────────────────────────────────────────────
	function formatCurrency(v: number) {
		return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);
	}

	function pct(v: number) {
		return `${v.toFixed(1)}%`;
	}
</script>

<svelte:head>
	<title>Financial Analytics — Jhaerin Tire Supply</title>
</svelte:head>

<div class="space-y-8 p-6">
	<!-- Page header -->
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-foreground text-2xl font-bold">Financial Analytics</h1>
			<p class="text-muted-foreground mt-1 text-sm">Profit margins, inventory turnover, and sales forecasts</p>
		</div>

		<!-- Period filter button -->
		<button
			type="button"
			onclick={() => (filterOpen = true)}
			class="border-border text-foreground hover:bg-muted inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
			{data.from} → {data.to}
		</button>
	</div>

	<!-- Summary KPI cards -->
	<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
		<div class="bg-card border-border rounded-xl border p-4 shadow-sm">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Total Revenue</p>
			<p class="text-foreground mt-1 text-xl font-bold tabular-nums">{formatCurrency(data.totalRevenue)}</p>
		</div>
		<div class="bg-card border-border rounded-xl border p-4 shadow-sm">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Gross Profit</p>
			<p class={['mt-1 text-xl font-bold tabular-nums', data.totalGrossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'].join(' ')}>
				{formatCurrency(data.totalGrossProfit)}
			</p>
		</div>
		<div class="bg-card border-border rounded-xl border p-4 shadow-sm">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Overall Margin</p>
			<p class={['mt-1 text-xl font-bold tabular-nums', data.overallMargin >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'].join(' ')}>
				{pct(data.overallMargin)}
			</p>
		</div>
		<div class="bg-card border-border rounded-xl border p-4 shadow-sm">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Inventory Turnover</p>
			<p class="text-foreground mt-1 text-xl font-bold tabular-nums">
				{data.inventoryTurnover.toFixed(2)}×
			</p>
			<p class="text-muted-foreground mt-0.5 text-xs">COGS / avg inventory value</p>
		</div>
	</div>

	<!-- Revenue vs Profit chart -->
	<div class="bg-card border-border rounded-xl border p-5 shadow-sm">
		<RevenueProfitAnalysisChart data={data.monthlySummary} />
	</div>

	<!-- Monthly financial summary table -->
	<div class="bg-card border-border overflow-hidden rounded-xl border shadow-sm">
		<div class="border-border border-b px-5 py-4">
			<h2 class="text-foreground text-sm font-semibold">Monthly Financial Summary</h2>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-border border-b">
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Month</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Revenue</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Cost</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Gross Profit</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Margin %</th>
					</tr>
				</thead>
				<tbody class="divide-border divide-y">
					{#each data.monthlySummary as row (row.month)}
						<tr class="hover:bg-muted/40 transition-colors">
							<td class="text-foreground px-4 py-3 font-medium">{row.month}</td>
							<td class="text-foreground px-4 py-3 text-right tabular-nums">{formatCurrency(row.totalRevenue)}</td>
							<td class="text-muted-foreground px-4 py-3 text-right tabular-nums">{formatCurrency(row.totalCost)}</td>
							<td class={['px-4 py-3 text-right tabular-nums font-medium', row.totalGrossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'].join(' ')}>
								{formatCurrency(row.totalGrossProfit)}
							</td>
							<td class="text-muted-foreground px-4 py-3 text-right tabular-nums">{pct(row.profitMarginPercent)}</td>
						</tr>
					{:else}
						<tr><td colspan="5" class="text-muted-foreground px-4 py-10 text-center text-sm">No data for this period.</td></tr>
					{/each}
				</tbody>
				{#if data.monthlySummary.length > 0}
					<tfoot>
						<tr class="border-border border-t">
							<td class="text-foreground px-4 py-3 font-semibold">Total</td>
							<td class="text-foreground px-4 py-3 text-right tabular-nums font-semibold">{formatCurrency(data.totalRevenue)}</td>
							<td class="text-foreground px-4 py-3 text-right tabular-nums font-semibold">{formatCurrency(data.totalCost)}</td>
							<td class={['px-4 py-3 text-right tabular-nums font-bold', data.totalGrossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'].join(' ')}>
								{formatCurrency(data.totalGrossProfit)}
							</td>
							<td class="text-muted-foreground px-4 py-3 text-right tabular-nums font-semibold">{pct(data.overallMargin)}</td>
						</tr>
					</tfoot>
				{/if}
			</table>
		</div>
	</div>

	<!-- Inventory value summary -->
	<div class="bg-card border-border rounded-xl border p-5 shadow-sm">
		<div class="flex items-center justify-between">
			<h2 class="text-foreground text-sm font-semibold">Inventory Value</h2>
			<span class="text-foreground text-sm font-bold">{formatCurrency(data.inventoryValue.totalValue)}</span>
		</div>
		<p class="text-muted-foreground mt-1 text-xs">
			{data.inventoryValue.items.length} active products · Used as denominator for inventory turnover ratio
		</p>
	</div>

	<!-- Sales forecast section -->
	<div class="bg-card border-border rounded-xl border p-5 shadow-sm">
		<h2 class="text-foreground mb-4 text-sm font-semibold">Sales Forecast (3-month linear projection)</h2>

		<div class="mb-4 flex flex-wrap items-end gap-3">
			<div class="min-w-64 flex-1 space-y-1">
				<label for="forecast-product" class="text-foreground block text-xs font-medium">Select product</label>
				<select id="forecast-product" bind:value={forecastProductId} onchange={applyForecast}
					class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none">
					<option value="">— Select a product —</option>
					{#each data.inventoryValue.items as item (item.productId)}
						<option value={item.productId}>{item.brand} {item.size} — {item.pattern}</option>
					{/each}
				</select>
			</div>
		</div>

		{#if data.forecast && data.forecast.length > 0}
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-border border-b">
							<th class="text-muted-foreground px-4 py-3 text-left font-medium">Period</th>
							<th class="text-muted-foreground px-4 py-3 text-right font-medium">Forecasted Qty</th>
						</tr>
					</thead>
					<tbody class="divide-border divide-y">
						{#each data.forecast as point (point.period)}
							<tr class="hover:bg-muted/40 transition-colors">
								<td class="text-foreground px-4 py-3 font-medium">{point.period}</td>
								<td class="text-foreground px-4 py-3 text-right tabular-nums font-semibold">{point.forecastedQty}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
			<p class="text-muted-foreground mt-3 text-xs">
				Based on linear trend from the last 6 months of sales data.
			</p>
		{:else if forecastProductId}
			<p class="text-muted-foreground text-sm">No historical sales data available for this product.</p>
		{:else}
			<p class="text-muted-foreground text-sm">Select a product above to see its sales forecast.</p>
		{/if}
	</div>
</div>

<!-- Period filter dialog -->
{#if filterOpen}
	<div class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" role="presentation" onclick={() => (filterOpen = false)}></div>
	<div
		class="bg-card border-border fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-xl"
		role="dialog" aria-modal="true" aria-labelledby="period-filter-title"
	>
		<div class="mb-5 flex items-center justify-between">
			<h2 id="period-filter-title" class="text-foreground text-lg font-semibold">Select Period</h2>
			<button type="button" onclick={() => (filterOpen = false)} class="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors" aria-label="Close">
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
			</button>
		</div>

		<div class="space-y-4">
			<div class="space-y-1.5">
				<label for="fin-from" class="text-foreground block text-sm font-medium">From</label>
				<input id="fin-from" type="date" bind:value={fromFilter}
					class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none" />
			</div>
			<div class="space-y-1.5">
				<label for="fin-to" class="text-foreground block text-sm font-medium">To</label>
				<input id="fin-to" type="date" bind:value={toFilter}
					class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none" />
			</div>
			<div class="flex justify-end gap-3 pt-2">
				<button type="button" onclick={() => (filterOpen = false)} class="border-border text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors">Cancel</button>
				<button type="button" onclick={() => { applyFilters(); filterOpen = false; }} class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors">Apply</button>
			</div>
		</div>
	</div>
{/if}
