<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import SaleFormModal from '$lib/components/modals/SaleFormModal.svelte';
	import type { PageData } from './$types';

	// Sale row type from getSales (includes joined product fields)
	interface SaleRow {
		id: string;
		productId: string;
		quantitySold: number;
		revenue: string;
		cost: string;
		grossProfit: string;
		date: Date;
		createdAt: Date;
		brand: string;
		size: string;
		pattern: string;
	}

	let { data }: { data: PageData } = $props();

	// ── Modal state ──────────────────────────────────────────────────────────
	let createOpen = $state(false);
	let editOpen = $state(false);
	let selectedSale = $state<SaleRow | null>(null);

	// ── Delete ───────────────────────────────────────────────────────────────
	async function deleteSale(saleId: string) {
		const formData = new FormData();
		formData.set('saleId', saleId);
		const res = await fetch('?/deleteSale', { method: 'POST', body: formData });
		if (res.ok) window.location.reload();
	}

	// ── Search & filters ─────────────────────────────────────────────────────
	let searchValue = $state(data.search);
	let fromFilter = $state(data.from);
	let toFilter = $state(data.to);
	let searchTimeout: ReturnType<typeof setTimeout>;

	function handleSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => applyFilters(), 300);
	}

	function applyFilters() {
		const url = new URL($page.url);
		if (searchValue) url.searchParams.set('search', searchValue);
		else url.searchParams.delete('search');
		if (fromFilter) url.searchParams.set('from', fromFilter);
		else url.searchParams.delete('from');
		if (toFilter) url.searchParams.set('to', toFilter);
		else url.searchParams.delete('to');
		url.searchParams.delete('page');
		goto(url.toString(), { replaceState: true });
	}

	function clearFilters() {
		searchValue = '';
		fromFilter = '';
		toFilter = '';
		const url = new URL($page.url);
		['search', 'from', 'to', 'page'].forEach((k) => url.searchParams.delete(k));
		goto(url.toString(), { replaceState: true });
	}

	function goToPage(p: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', String(p));
		goto(url.toString());
	}

	// ── Helpers ──────────────────────────────────────────────────────────────
	const hasFilters = $derived(searchValue !== '' || fromFilter !== '' || toFilter !== '');

	function formatCurrency(v: string | number) {
		return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(v));
	}

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	function profitClass(v: string | number) {
		return Number(v) >= 0
			? 'text-green-600 dark:text-green-400'
			: 'text-destructive';
	}
</script>

<svelte:head>
	<title>Sales — Jhaerin Tire Supply</title>
</svelte:head>

<div class="space-y-6 p-6">
	<!-- Page header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-foreground text-2xl font-bold">Sales</h1>
			<p class="text-muted-foreground mt-1 text-sm">Record and manage sales transactions</p>
		</div>
		<button
			type="button"
			onclick={() => (createOpen = true)}
			class="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
			Record sale
		</button>
	</div>

	<!-- Filters -->
	<div class="flex flex-wrap items-end gap-3">
		<!-- Search -->
		<div class="relative min-w-56 flex-1">
			<svg class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<circle cx="11" cy="11" r="8" /><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35" />
			</svg>
			<input type="search" bind:value={searchValue} oninput={handleSearch} placeholder="Search brand, size, pattern…"
				class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border py-2 pr-4 pl-9 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
				aria-label="Search sales" />
		</div>

		<!-- Date range -->
		<div class="space-y-1">
			<label for="sales-from" class="text-foreground block text-xs font-medium">From</label>
			<input id="sales-from" type="date" bind:value={fromFilter} onchange={applyFilters}
				class="border-input bg-background text-foreground focus:ring-ring rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none" />
		</div>
		<div class="space-y-1">
			<label for="sales-to" class="text-foreground block text-xs font-medium">To</label>
			<input id="sales-to" type="date" bind:value={toFilter} onchange={applyFilters}
				class="border-input bg-background text-foreground focus:ring-ring rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none" />
		</div>

		{#if hasFilters}
			<button type="button" onclick={clearFilters} class="text-muted-foreground hover:text-foreground text-sm transition-colors">Clear filters</button>
		{/if}
	</div>

	<!-- Sales table -->
	<div class="bg-card border-border overflow-hidden rounded-xl border shadow-sm">
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-border border-b">
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Product</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Qty</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Revenue</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Cost</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Gross Profit</th>
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Date</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-border divide-y">
					{#each data.sales as sale (sale.id)}
						<tr class="hover:bg-muted/40 transition-colors">
							<td class="text-foreground px-4 py-3 font-medium">{sale.brand} {sale.size} — {sale.pattern}</td>
							<td class="text-foreground px-4 py-3 text-right tabular-nums">{sale.quantitySold}</td>
							<td class="text-foreground px-4 py-3 text-right tabular-nums">{formatCurrency(sale.revenue)}</td>
							<td class="text-muted-foreground px-4 py-3 text-right tabular-nums">{formatCurrency(sale.cost)}</td>
							<td class={['px-4 py-3 text-right tabular-nums font-medium', profitClass(sale.grossProfit)].join(' ')}>{formatCurrency(sale.grossProfit)}</td>
							<td class="text-muted-foreground px-4 py-3 whitespace-nowrap">{formatDate(sale.date)}</td>
							<td class="px-4 py-3">
								<div class="flex items-center justify-end gap-2">
									<button type="button" onclick={() => { selectedSale = sale as SaleRow; editOpen = true; }}
										class="text-muted-foreground hover:text-foreground rounded p-1 transition-colors" aria-label="Edit sale">
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
									</button>
									<button type="button" onclick={() => deleteSale(sale.id)}
										class="text-destructive hover:text-destructive/80 rounded p-1 transition-colors" aria-label="Delete sale">
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
									</button>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="7" class="text-muted-foreground px-4 py-12 text-center text-sm">
								{hasFilters ? 'No sales match the current filters.' : 'No sales recorded yet.'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		{#if data.sales.length === 25}
			<div class="border-border flex items-center justify-between border-t px-4 py-3">
				<p class="text-muted-foreground text-sm">Page {data.page}</p>
				<div class="flex gap-2">
					{#if data.page > 1}
						<button type="button" onclick={() => goToPage(data.page - 1)} class="border-border text-foreground hover:bg-muted rounded-lg border px-3 py-1.5 text-sm transition-colors">Previous</button>
					{/if}
					<button type="button" onclick={() => goToPage(data.page + 1)} class="border-border text-foreground hover:bg-muted rounded-lg border px-3 py-1.5 text-sm transition-colors">Next</button>
				</div>
			</div>
		{/if}
	</div>
</div>

<!-- Modals -->
<SaleFormModal bind:open={createOpen} formData={data.form} products={data.products} onclose={() => (createOpen = false)} />

{#if selectedSale}
	<SaleFormModal bind:open={editOpen} formData={data.form} products={data.products} editSale={selectedSale} onclose={() => { editOpen = false; selectedSale = null; }} />
{/if}
