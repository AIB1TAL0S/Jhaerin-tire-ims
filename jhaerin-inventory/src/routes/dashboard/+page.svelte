<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import SalesBarChart from '$lib/components/SalesBarChart.svelte';
	import RevenueProfitLineChart from '$lib/components/RevenueProfitLineChart.svelte';
	import SalesByCategoryPieChart from '$lib/components/SalesByCategoryPieChart.svelte';
	import type { PageData } from './$types';
	import type { Product } from '$lib/server/db/schema';

	let { data }: { data: PageData } = $props();
	const canViewSalesMetrics = $derived(data.canViewSalesMetrics);

	// ── Date range & granularity filters ─────────────────────────────────────
	let fromFilter = $state('');
	let toFilter = $state('');

	$effect(() => {
		fromFilter = data.from;
		toFilter = data.to;
	});

	function applyDateRange() {
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

	// ── Product detail modal ─────────────────────────────────────────────────
	let detailProduct = $state<Product | null>(null);
	let detailOpen = $state(false);

	function openDetail(product: Product) {
		detailProduct = product;
		detailOpen = true;
	}

	// ── Helpers ──────────────────────────────────────────────────────────────
	function formatCurrency(v: number) {
		return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(v);
	}
</script>

<svelte:head>
	<title>Dashboard — Jhaerin Tire Supply</title>
</svelte:head>

<div class="space-y-6 p-6">
	<!-- Page header -->
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-foreground text-2xl font-bold">Dashboard</h1>
			<p class="text-muted-foreground mt-1 text-sm">Business overview for the selected period</p>
		</div>

		<!-- Date range filter -->
		<div class="flex flex-wrap items-end gap-3">
			<div class="space-y-1">
				<label for="dash-from" class="text-foreground block text-xs font-medium">From</label>
				<input id="dash-from" type="date" bind:value={fromFilter} onchange={applyDateRange}
					class="border-input bg-background text-foreground focus:ring-ring rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none" />
			</div>
			<div class="space-y-1">
				<label for="dash-to" class="text-foreground block text-xs font-medium">To</label>
				<input id="dash-to" type="date" bind:value={toFilter} onchange={applyDateRange}
					class="border-input bg-background text-foreground focus:ring-ring rounded-lg border px-3 py-1.5 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none" />
			</div>
		</div>
	</div>

	<!-- KPI cards -->
	<div class={['grid grid-cols-2 gap-4 sm:grid-cols-3', canViewSalesMetrics ? 'lg:grid-cols-6' : 'lg:grid-cols-4'].join(' ')}>
		<!-- Total products -->
		<div class="bg-card border-border rounded-xl border p-4 shadow-sm">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Products</p>
			<p class="text-foreground mt-1 text-2xl font-bold tabular-nums">{data.kpis.totalProducts}</p>
			<a href="/inventory" class="text-muted-foreground hover:text-primary mt-1 block text-xs transition-colors">View inventory →</a>
		</div>

		<!-- Aggregate stock -->
		<div class="bg-card border-border rounded-xl border p-4 shadow-sm">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Total Stock</p>
			<p class="text-foreground mt-1 text-2xl font-bold tabular-nums">{data.kpis.totalStock}</p>
			<a href="/inventory" class="text-muted-foreground hover:text-primary mt-1 block text-xs transition-colors">View inventory →</a>
		</div>

		<!-- Stock-In -->
		<div class="bg-card border-border rounded-xl border p-4 shadow-sm">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Stock-In</p>
			<p class="mt-1 text-2xl font-bold tabular-nums text-green-600 dark:text-green-400">+{data.kpis.stockInSummary}</p>
			<a href="/stock?tab=in&from={data.from}&to={data.to}" class="text-muted-foreground hover:text-primary mt-1 block text-xs transition-colors">View stock-in →</a>
		</div>

		<!-- Stock-Out -->
		<div class="bg-card border-border rounded-xl border p-4 shadow-sm">
			<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Stock-Out</p>
			<p class="text-destructive mt-1 text-2xl font-bold tabular-nums">−{data.kpis.stockOutSummary}</p>
			<a href="/stock?tab=out&from={data.from}&to={data.to}" class="text-muted-foreground hover:text-primary mt-1 block text-xs transition-colors">View stock-out →</a>
		</div>

		{#if canViewSalesMetrics}
			<!-- Revenue -->
			<div class="bg-card border-border rounded-xl border p-4 shadow-sm">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Revenue</p>
				<p class="text-foreground mt-1 text-xl font-bold tabular-nums">{formatCurrency(data.kpis.totalRevenue)}</p>
				<a href="/sales?from={data.from}&to={data.to}" class="text-muted-foreground hover:text-primary mt-1 block text-xs transition-colors">View sales →</a>
			</div>

			<!-- Gross profit -->
			<div class="bg-card border-border rounded-xl border p-4 shadow-sm">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Gross Profit</p>
				<p class={['mt-1 text-xl font-bold tabular-nums', data.kpis.totalGrossProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'].join(' ')}>
					{formatCurrency(data.kpis.totalGrossProfit)}
				</p>
				<a href="/reports?from={data.from}&to={data.to}" class="text-muted-foreground hover:text-primary mt-1 block text-xs transition-colors">View reports →</a>
			</div>
		{/if}
	</div>

	{#if canViewSalesMetrics}
		<!-- Peak / Lowest sales month -->
		<div class="grid grid-cols-2 gap-4">
			<div class="bg-card border-border rounded-xl border p-4 shadow-sm">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Peak Sales Month ({new Date().getFullYear()})</p>
				<p class="text-foreground mt-1 text-lg font-semibold">{data.peakLowest.peak}</p>
			</div>
			<div class="bg-card border-border rounded-xl border p-4 shadow-sm">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Lowest Sales Month ({new Date().getFullYear()})</p>
				<p class="text-foreground mt-1 text-lg font-semibold">{data.peakLowest.lowest}</p>
			</div>
		</div>

		<!-- Charts row -->
		<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
			<!-- Sales bar chart -->
			<div class="bg-card border-border rounded-xl border p-5 shadow-sm">
				<SalesBarChart
					data={data.chartData}
					granularity={data.granularity}
					onGranularityChange={changeGranularity}
				/>
			</div>

			<!-- Revenue/profit line chart -->
			<div class="bg-card border-border rounded-xl border p-5 shadow-sm">
				<RevenueProfitLineChart data={data.trendData} />
			</div>
		</div>

		<!-- Pie chart -->
		<div class="bg-card border-border rounded-xl border p-5 shadow-sm">
			<SalesByCategoryPieChart data={data.categoryData} />
		</div>
	{/if}

	<!-- Alerts row -->
	<div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
		<!-- Low stock alerts -->
		<div class="bg-card border-border rounded-xl border shadow-sm">
			<div class="border-border flex items-center justify-between border-b px-5 py-4">
				<h2 class="text-foreground text-sm font-semibold">
					Low Stock Alerts
					{#if data.lowStock.length > 0}
						<span class="bg-destructive/10 text-destructive ml-2 rounded-full px-2 py-0.5 text-xs font-medium">{data.lowStock.length}</span>
					{/if}
				</h2>
			</div>
			<ul class="divide-border divide-y">
				{#each data.lowStock as product (product.id)}
					<li class="hover:bg-muted/40 transition-colors">
						<button
							type="button"
							onclick={() => openDetail(product)}
							class="flex w-full items-center justify-between px-5 py-3 text-left"
						>
							<span>
								<span class="text-foreground text-sm font-medium">{product.brand} {product.size}</span>
								<span class="text-muted-foreground ml-1 text-xs">{product.pattern}</span>
							</span>
							<span class="text-destructive text-sm font-semibold tabular-nums">{product.quantity} left</span>
						</button>
					</li>
				{:else}
					<li class="text-muted-foreground px-5 py-6 text-center text-sm">No low-stock products.</li>
				{/each}
			</ul>
		</div>

		<!-- Dead stock alerts -->
		<div class="bg-card border-border rounded-xl border shadow-sm">
			<div class="border-border flex items-center justify-between border-b px-5 py-4">
				<h2 class="text-foreground text-sm font-semibold">
					Dead Stock (90+ days)
					{#if data.deadStock.length > 0}
						<span class="bg-muted text-muted-foreground ml-2 rounded-full px-2 py-0.5 text-xs font-medium">{data.deadStock.length}</span>
					{/if}
				</h2>
			</div>
			<ul class="divide-border divide-y">
				{#each data.deadStock.slice(0, 10) as product (product.id)}
					<li class="hover:bg-muted/40 transition-colors">
						<button
							type="button"
							onclick={() => openDetail(product)}
							class="flex w-full items-center justify-between px-5 py-3 text-left"
						>
							<span>
								<span class="text-foreground text-sm font-medium">{product.brand} {product.size}</span>
								<span class="text-muted-foreground ml-1 text-xs">{product.pattern}</span>
							</span>
							<span class="text-muted-foreground text-sm tabular-nums">{product.quantity} units</span>
						</button>
					</li>
				{:else}
					<li class="text-muted-foreground px-5 py-6 text-center text-sm">No dead-stock products.</li>
				{/each}
			</ul>
		</div>
	</div>
</div>

<!-- Product detail modal -->
{#if detailOpen && detailProduct}
	<div class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" role="presentation" onclick={() => { detailOpen = false; detailProduct = null; }}></div>
	<div
		class="bg-card border-border fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-xl"
		role="dialog" aria-modal="true" aria-labelledby="product-detail-title"
	>
		<div class="mb-4 flex items-center justify-between">
			<h2 id="product-detail-title" class="text-foreground text-lg font-semibold">Product Detail</h2>
			<button type="button" onclick={() => { detailOpen = false; detailProduct = null; }} class="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors" aria-label="Close">
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
			</button>
		</div>
		<dl class="space-y-2 text-sm">
			<div class="flex justify-between"><dt class="text-muted-foreground">Brand</dt><dd class="text-foreground font-medium">{detailProduct.brand}</dd></div>
			<div class="flex justify-between"><dt class="text-muted-foreground">Size</dt><dd class="text-foreground">{detailProduct.size}</dd></div>
			<div class="flex justify-between"><dt class="text-muted-foreground">Pattern</dt><dd class="text-foreground">{detailProduct.pattern}</dd></div>
			<div class="flex justify-between"><dt class="text-muted-foreground">Stock</dt><dd class="text-foreground tabular-nums">{detailProduct.quantity}</dd></div>
			<div class="flex justify-between"><dt class="text-muted-foreground">Low stock threshold</dt><dd class="text-foreground tabular-nums">{detailProduct.lowStockThreshold}</dd></div>
			<div class="flex justify-between"><dt class="text-muted-foreground">Cost price</dt><dd class="text-foreground tabular-nums">{formatCurrency(Number(detailProduct.costPrice))}</dd></div>
			<div class="flex justify-between"><dt class="text-muted-foreground">Retail price</dt><dd class="text-foreground tabular-nums">{formatCurrency(Number(detailProduct.retailPrice))}</dd></div>
			<div class="flex justify-between"><dt class="text-muted-foreground">Provider</dt><dd class="text-foreground">{detailProduct.deliveryProvider}</dd></div>
		</dl>
		<div class="mt-5 flex justify-end">
			<a href="/inventory" class="text-primary hover:text-primary/80 text-sm font-medium transition-colors">View in Inventory →</a>
		</div>
	</div>
{/if}
