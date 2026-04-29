<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import SalesBarChart from '$lib/components/SalesBarChart.svelte';
	import ReportExportModal from '$lib/components/modals/ReportExportModal.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// ── Filters ──────────────────────────────────────────────────────────────
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

	function changeGranularity(g: 'daily' | 'weekly' | 'monthly') {
		const url = new URL($page.url);
		url.searchParams.set('granularity', g);
		goto(url.toString(), { replaceState: true });
	}

	// ── Export modal ─────────────────────────────────────────────────────────
	let exportOpen = $state(false);

	// ── Helpers ──────────────────────────────────────────────────────────────
	function formatCurrency(v: number) {
		return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);
	}

	function pct(v: number) {
		return `${v.toFixed(1)}%`;
	}
</script>

<svelte:head>
	<title>Reports — Jhaerin Tire Supply</title>
</svelte:head>

<!-- Print styles -->
<style>
	@media print {
		.no-print { display: none !important; }
		.print-break { page-break-before: always; }
	}
</style>

<div class="space-y-8 p-6">
	<!-- Page header -->
	<div class="no-print flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-foreground text-2xl font-bold">Reports</h1>
			<p class="text-muted-foreground mt-1 text-sm">Analytics and performance reports</p>
		</div>

		<div class="flex flex-wrap items-end gap-3">
			<!-- Date range -->
			<div class="space-y-1">
				<label for="rep-from" class="text-foreground block text-xs font-medium">From</label>
				<input id="rep-from" type="date" bind:value={fromFilter} onchange={applyFilters}
					class="border-input bg-background text-foreground focus:ring-ring rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none" />
			</div>
			<div class="space-y-1">
				<label for="rep-to" class="text-foreground block text-xs font-medium">To</label>
				<input id="rep-to" type="date" bind:value={toFilter} onchange={applyFilters}
					class="border-input bg-background text-foreground focus:ring-ring rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none" />
			</div>

			<!-- Export button -->
			<button type="button" onclick={() => (exportOpen = true)}
				class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors">
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
				Export
			</button>

			<!-- Print button -->
			<button type="button" onclick={() => window.print()}
				class="border-border text-foreground hover:bg-muted inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors">
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>
				Print
			</button>
		</div>
	</div>

	<!-- Print header (only visible when printing) -->
	<div class="hidden print:block mb-6">
		<h1 class="text-2xl font-bold">Jhaerin Tire Supply — Report</h1>
		<p class="text-sm text-gray-500">Period: {data.from} to {data.to} · Generated: {new Date().toLocaleDateString()}</p>
	</div>

	<!-- Sales trend chart -->
	<div class="bg-card border-border rounded-xl border p-5 shadow-sm">
		<SalesBarChart
			data={data.chartData}
			granularity={data.granularity}
			onGranularityChange={changeGranularity}
		/>
	</div>

	<!-- Revenue & Profit by period -->
	<div class="bg-card border-border overflow-hidden rounded-xl border shadow-sm">
		<div class="border-border border-b px-5 py-4">
			<h2 class="text-foreground text-sm font-semibold">Revenue & Profit by Period</h2>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-border border-b">
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Period</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Revenue</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Cost</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Gross Profit</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Margin</th>
					</tr>
				</thead>
				<tbody class="divide-border divide-y">
					{#each data.periodSummary as row (row.period)}
						<tr class="hover:bg-muted/40 transition-colors">
							<td class="text-foreground px-4 py-3 font-medium">{row.period}</td>
							<td class="text-foreground px-4 py-3 text-right tabular-nums">{formatCurrency(row.totalRevenue)}</td>
							<td class="text-muted-foreground px-4 py-3 text-right tabular-nums">{formatCurrency(row.totalCost)}</td>
							<td class={['px-4 py-3 text-right tabular-nums font-medium', row.totalGrossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'].join(' ')}>{formatCurrency(row.totalGrossProfit)}</td>
							<td class="text-muted-foreground px-4 py-3 text-right tabular-nums">{pct(row.profitMarginPercent)}</td>
						</tr>
					{:else}
						<tr><td colspan="5" class="text-muted-foreground px-4 py-10 text-center text-sm">No data for this period.</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Top & Least selling side by side -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2 print-break">
		<!-- Top selling -->
		<div class="bg-card border-border overflow-hidden rounded-xl border shadow-sm">
			<div class="border-border border-b px-5 py-4">
				<h2 class="text-foreground text-sm font-semibold">Top Selling Products</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-border border-b">
							<th class="text-muted-foreground px-4 py-3 text-left font-medium">Product</th>
							<th class="text-muted-foreground px-4 py-3 text-right font-medium">Qty Sold</th>
							<th class="text-muted-foreground px-4 py-3 text-right font-medium">Revenue</th>
						</tr>
					</thead>
					<tbody class="divide-border divide-y">
						{#each data.topSelling as item, i (item.productId)}
							<tr class="hover:bg-muted/40 transition-colors">
								<td class="px-4 py-3">
									<span class="text-muted-foreground mr-2 text-xs tabular-nums">#{i + 1}</span>
									<span class="text-foreground font-medium">{item.brand} {item.size}</span>
									<span class="text-muted-foreground ml-1 text-xs">{item.pattern}</span>
								</td>
								<td class="text-foreground px-4 py-3 text-right tabular-nums font-medium">{item.totalQuantitySold}</td>
								<td class="text-foreground px-4 py-3 text-right tabular-nums">{formatCurrency(item.totalRevenue)}</td>
							</tr>
						{:else}
							<tr><td colspan="3" class="text-muted-foreground px-4 py-8 text-center text-sm">No sales data.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Least selling -->
		<div class="bg-card border-border overflow-hidden rounded-xl border shadow-sm">
			<div class="border-border border-b px-5 py-4">
				<h2 class="text-foreground text-sm font-semibold">Least Selling Products</h2>
			</div>
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-border border-b">
							<th class="text-muted-foreground px-4 py-3 text-left font-medium">Product</th>
							<th class="text-muted-foreground px-4 py-3 text-right font-medium">Qty Sold</th>
							<th class="text-muted-foreground px-4 py-3 text-right font-medium">Revenue</th>
						</tr>
					</thead>
					<tbody class="divide-border divide-y">
						{#each data.leastSelling as item, i (item.productId)}
							<tr class="hover:bg-muted/40 transition-colors">
								<td class="px-4 py-3">
									<span class="text-foreground font-medium">{item.brand} {item.size}</span>
									<span class="text-muted-foreground ml-1 text-xs">{item.pattern}</span>
								</td>
								<td class="text-muted-foreground px-4 py-3 text-right tabular-nums">{item.totalQuantitySold}</td>
								<td class="text-muted-foreground px-4 py-3 text-right tabular-nums">{formatCurrency(item.totalRevenue)}</td>
							</tr>
						{:else}
							<tr><td colspan="3" class="text-muted-foreground px-4 py-8 text-center text-sm">No sales data.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</div>

	<!-- Inventory value report -->
	<div class="bg-card border-border overflow-hidden rounded-xl border shadow-sm print-break">
		<div class="border-border flex items-center justify-between border-b px-5 py-4">
			<h2 class="text-foreground text-sm font-semibold">Inventory Value</h2>
			<span class="text-foreground text-sm font-semibold">
				Total: {formatCurrency(data.inventoryValue.totalValue)}
			</span>
		</div>
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-border border-b">
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Product</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Qty</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Cost Price</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Value</th>
					</tr>
				</thead>
				<tbody class="divide-border divide-y">
					{#each data.inventoryValue.items as item (item.productId)}
						<tr class="hover:bg-muted/40 transition-colors">
							<td class="px-4 py-3">
								<span class="text-foreground font-medium">{item.brand} {item.size}</span>
								<span class="text-muted-foreground ml-1 text-xs">{item.pattern}</span>
							</td>
							<td class="text-foreground px-4 py-3 text-right tabular-nums">{item.quantity}</td>
							<td class="text-muted-foreground px-4 py-3 text-right tabular-nums">{formatCurrency(item.costPrice)}</td>
							<td class="text-foreground px-4 py-3 text-right tabular-nums font-medium">{formatCurrency(item.inventoryValue)}</td>
						</tr>
					{:else}
						<tr><td colspan="4" class="text-muted-foreground px-4 py-10 text-center text-sm">No inventory data.</td></tr>
					{/each}
				</tbody>
				{#if data.inventoryValue.items.length > 0}
					<tfoot>
						<tr class="border-border border-t">
							<td colspan="3" class="text-foreground px-4 py-3 text-right font-semibold">Total</td>
							<td class="text-foreground px-4 py-3 text-right tabular-nums font-bold">{formatCurrency(data.inventoryValue.totalValue)}</td>
						</tr>
					</tfoot>
				{/if}
			</table>
		</div>
	</div>
</div>

<!-- Export modal -->
<ReportExportModal bind:open={exportOpen} from={data.from} to={data.to} onclose={() => (exportOpen = false)} />
