<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import StockInFormModal from '$lib/components/modals/StockInFormModal.svelte';
	import StockOutFormModal from '$lib/components/modals/StockOutFormModal.svelte';
	import type { PageData } from './$types';
	import type { StockIn, StockOut } from '$lib/server/db/schema';

	let { data }: { data: PageData } = $props();

	// ── Tab state ────────────────────────────────────────────────────────────
	let activeTab = $state('in');

	$effect(() => {
		activeTab = data.tab;
	});

	function setTab(tab: string) {
		activeTab = tab;
		const url = new URL($page.url);
		url.searchParams.set('tab', tab);
		url.searchParams.delete('page');
		goto(url.toString(), { replaceState: true });
	}

	// ── Modal state ──────────────────────────────────────────────────────────
	let createInOpen = $state(false);
	let editInOpen = $state(false);
	let createOutOpen = $state(false);
	let editOutOpen = $state(false);
	let selectedIn = $state<StockIn | null>(null);
	let selectedOut = $state<StockOut | null>(null);

	// ── Delete helpers ───────────────────────────────────────────────────────
	async function deleteRecord(action: string, recordId: string) {
		const formData = new FormData();
		formData.set('recordId', recordId);
		const res = await fetch(`?/${action}`, { method: 'POST', body: formData });
		if (res.ok) window.location.reload();
	}

	// ── Pagination ───────────────────────────────────────────────────────────
	function goToPage(p: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', String(p));
		goto(url.toString());
	}

	// ── Helpers ──────────────────────────────────────────────────────────────
	function formatDate(d: Date | string) {
		return new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
	}

	function productName(productId: string) {
		const p = data.products.find((x) => x.id === productId);
		return p ? `${p.brand} ${p.size} — ${p.pattern}` : productId;
	}
</script>

<svelte:head>
	<title>Stock Transactions — Jhaerin Tire Supply</title>
</svelte:head>

<div class="space-y-6 p-6">
	<!-- Page header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-foreground text-2xl font-bold">Stock Transactions</h1>
			<p class="text-muted-foreground mt-1 text-sm">Track incoming and outgoing inventory movements</p>
		</div>
		{#if activeTab === 'in'}
			<button type="button" onclick={() => (createInOpen = true)}
				class="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none">
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
				Record Stock-In
			</button>
		{:else}
			<button type="button" onclick={() => (createOutOpen = true)}
				class="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none">
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
				Record Stock-Out
			</button>
		{/if}
	</div>

	<!-- Tabs -->
	<div class="border-border border-b">
		<nav class="-mb-px flex gap-6" aria-label="Stock transaction tabs">
			<button
				type="button"
				onclick={() => setTab('in')}
				class={['pb-3 text-sm font-medium transition-colors border-b-2', activeTab === 'in'
					? 'border-primary text-primary'
					: 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'].join(' ')}
				aria-current={activeTab === 'in' ? 'page' : undefined}
			>
				Stock-In
				<span class="bg-muted text-muted-foreground ml-2 rounded-full px-2 py-0.5 text-xs">{data.stockIn.length}</span>
			</button>
			<button
				type="button"
				onclick={() => setTab('out')}
				class={['pb-3 text-sm font-medium transition-colors border-b-2', activeTab === 'out'
					? 'border-primary text-primary'
					: 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'].join(' ')}
				aria-current={activeTab === 'out' ? 'page' : undefined}
			>
				Stock-Out
				<span class="bg-muted text-muted-foreground ml-2 rounded-full px-2 py-0.5 text-xs">{data.stockOut.length}</span>
			</button>
		</nav>
	</div>

	<!-- Stock-In table -->
	{#if activeTab === 'in'}
		<div class="bg-card border-border overflow-hidden rounded-xl border shadow-sm">
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-border border-b">
							<th class="text-muted-foreground px-4 py-3 text-left font-medium">Product</th>
							<th class="text-muted-foreground px-4 py-3 text-right font-medium">Qty</th>
							<th class="text-muted-foreground px-4 py-3 text-left font-medium">Provider</th>
							<th class="text-muted-foreground px-4 py-3 text-left font-medium">Date</th>
							<th class="text-muted-foreground px-4 py-3 text-right font-medium">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-border divide-y">
						{#each data.stockIn as record (record.id)}
							<tr class="hover:bg-muted/40 transition-colors">
								<td class="text-foreground px-4 py-3">{productName(record.productId)}</td>
								<td class="text-foreground px-4 py-3 text-right tabular-nums font-medium">+{record.quantity}</td>
								<td class="text-muted-foreground px-4 py-3">{record.deliveryProvider}</td>
								<td class="text-muted-foreground px-4 py-3">{formatDate(record.date)}</td>
								<td class="px-4 py-3">
									<div class="flex items-center justify-end gap-2">
										<button type="button" onclick={() => { selectedIn = record; editInOpen = true; }}
											class="text-muted-foreground hover:text-foreground rounded p-1 transition-colors" aria-label="Edit record">
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
										</button>
										<button type="button" onclick={() => deleteRecord('deleteStockIn', record.id)}
											class="text-destructive hover:text-destructive/80 rounded p-1 transition-colors" aria-label="Delete record">
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
										</button>
									</div>
								</td>
							</tr>
						{:else}
							<tr><td colspan="5" class="text-muted-foreground px-4 py-12 text-center text-sm">No Stock-In records yet.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if data.stockIn.length === 25}
				<div class="border-border flex items-center justify-between border-t px-4 py-3">
					<p class="text-muted-foreground text-sm">Page {data.page}</p>
					<div class="flex gap-2">
						{#if data.page > 1}<button type="button" onclick={() => goToPage(data.page - 1)} class="border-border text-foreground hover:bg-muted rounded-lg border px-3 py-1.5 text-sm transition-colors">Previous</button>{/if}
						<button type="button" onclick={() => goToPage(data.page + 1)} class="border-border text-foreground hover:bg-muted rounded-lg border px-3 py-1.5 text-sm transition-colors">Next</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}

	<!-- Stock-Out table -->
	{#if activeTab === 'out'}
		<div class="bg-card border-border overflow-hidden rounded-xl border shadow-sm">
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-border border-b">
							<th class="text-muted-foreground px-4 py-3 text-left font-medium">Product</th>
							<th class="text-muted-foreground px-4 py-3 text-right font-medium">Qty</th>
							<th class="text-muted-foreground px-4 py-3 text-left font-medium">Reason</th>
							<th class="text-muted-foreground px-4 py-3 text-left font-medium">Date</th>
							<th class="text-muted-foreground px-4 py-3 text-right font-medium">Actions</th>
						</tr>
					</thead>
					<tbody class="divide-border divide-y">
						{#each data.stockOut as record (record.id)}
							<tr class="hover:bg-muted/40 transition-colors">
								<td class="text-foreground px-4 py-3">{productName(record.productId)}</td>
								<td class="text-destructive px-4 py-3 text-right tabular-nums font-medium">−{record.quantity}</td>
								<td class="text-muted-foreground px-4 py-3">{record.reason}</td>
								<td class="text-muted-foreground px-4 py-3">{formatDate(record.date)}</td>
								<td class="px-4 py-3">
									<div class="flex items-center justify-end gap-2">
										<button type="button" onclick={() => { selectedOut = record; editOutOpen = true; }}
											class="text-muted-foreground hover:text-foreground rounded p-1 transition-colors" aria-label="Edit record">
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
										</button>
										<button type="button" onclick={() => deleteRecord('deleteStockOut', record.id)}
											class="text-destructive hover:text-destructive/80 rounded p-1 transition-colors" aria-label="Delete record">
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
										</button>
									</div>
								</td>
							</tr>
						{:else}
							<tr><td colspan="5" class="text-muted-foreground px-4 py-12 text-center text-sm">No Stock-Out records yet.</td></tr>
						{/each}
					</tbody>
				</table>
			</div>
			{#if data.stockOut.length === 25}
				<div class="border-border flex items-center justify-between border-t px-4 py-3">
					<p class="text-muted-foreground text-sm">Page {data.page}</p>
					<div class="flex gap-2">
						{#if data.page > 1}<button type="button" onclick={() => goToPage(data.page - 1)} class="border-border text-foreground hover:bg-muted rounded-lg border px-3 py-1.5 text-sm transition-colors">Previous</button>{/if}
						<button type="button" onclick={() => goToPage(data.page + 1)} class="border-border text-foreground hover:bg-muted rounded-lg border px-3 py-1.5 text-sm transition-colors">Next</button>
					</div>
				</div>
			{/if}
		</div>
	{/if}
</div>

<!-- Modals -->
<StockInFormModal bind:open={createInOpen} formData={data.stockInForm} products={data.products} onclose={() => (createInOpen = false)} />
<StockOutFormModal bind:open={createOutOpen} formData={data.stockOutForm} products={data.products} onclose={() => (createOutOpen = false)} />

{#if selectedIn}
	<StockInFormModal bind:open={editInOpen} formData={data.stockInForm} products={data.products} editRecord={selectedIn} onclose={() => { editInOpen = false; selectedIn = null; }} />
{/if}
{#if selectedOut}
	<StockOutFormModal bind:open={editOutOpen} formData={data.stockOutForm} products={data.products} editRecord={selectedOut} onclose={() => { editOutOpen = false; selectedOut = null; }} />
{/if}
