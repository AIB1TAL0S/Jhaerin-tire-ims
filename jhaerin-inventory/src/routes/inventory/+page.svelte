<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ProductFormModal from '$lib/components/modals/ProductFormModal.svelte';
	import ArchiveProductModal from '$lib/components/modals/ArchiveProductModal.svelte';
	import type { PageData } from './$types';
	import type { Product } from '$lib/server/db/schema';

	let { data }: { data: PageData } = $props();

	// ── Modal state ──────────────────────────────────────────────────────────
	let createModalOpen = $state(false);
	let editModalOpen = $state(false);
	let archiveModalOpen = $state(false);
	let selectedProduct = $state<Product | null>(null);

	function openEdit(product: Product) {
		selectedProduct = product;
		editModalOpen = true;
	}

	function openArchive(product: Product) {
		selectedProduct = product;
		archiveModalOpen = true;
	}

	// ── Search & filters ─────────────────────────────────────────────────────
	let searchValue = $state('');
	let providerFilter = $state('');
	let lowStockFilter = $state(false);
	let searchTimeout: ReturnType<typeof setTimeout>;

	$effect(() => {
		searchValue = data.search;
		providerFilter = data.deliveryProvider;
		lowStockFilter = data.lowStockOnly;
	});

	function handleSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => applyFilters(), 300);
	}

	function applyFilters() {
		const url = new URL($page.url);
		if (searchValue) url.searchParams.set('search', searchValue);
		else url.searchParams.delete('search');
		if (providerFilter) url.searchParams.set('provider', providerFilter);
		else url.searchParams.delete('provider');
		if (lowStockFilter) url.searchParams.set('lowStock', 'true');
		else url.searchParams.delete('lowStock');
		url.searchParams.delete('page');
		goto(url.toString(), { replaceState: true });
	}

	function clearFilters() {
		searchValue = '';
		providerFilter = '';
		lowStockFilter = false;
		const url = new URL($page.url);
		url.searchParams.delete('search');
		url.searchParams.delete('provider');
		url.searchParams.delete('lowStock');
		url.searchParams.delete('page');
		goto(url.toString(), { replaceState: true });
	}

	function goToPage(p: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', String(p));
		goto(url.toString());
	}

	// ── Helpers ──────────────────────────────────────────────────────────────
	const hasFilters = $derived(
		searchValue !== '' || providerFilter !== '' || lowStockFilter
	);

	function formatCurrency(value: string | number) {
		return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(
			Number(value)
		);
	}

	function stockBadgeClass(product: Product) {
		if (product.quantity <= product.lowStockThreshold) {
			return 'bg-destructive/10 text-destructive';
		}
		return 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200';
	}
</script>

<svelte:head>
	<title>Inventory — Jhaerin Tire Supply</title>
</svelte:head>

<div class="space-y-6 p-6">
	<!-- Page header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-foreground text-2xl font-bold">Inventory</h1>
			<p class="text-muted-foreground mt-1 text-sm">Manage tire products and stock levels</p>
		</div>
		<button
			type="button"
			onclick={() => (createModalOpen = true)}
			class="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
			</svg>
			Add product
		</button>
	</div>

	<!-- Filters bar -->
	<div class="flex flex-wrap items-end gap-3">
		<!-- Search -->
		<div class="relative min-w-56 flex-1">
			<svg class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<circle cx="11" cy="11" r="8" /><path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35" />
			</svg>
			<input
				type="search"
				bind:value={searchValue}
				oninput={handleSearch}
				placeholder="Search brand, size, pattern…"
				class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border py-2 pr-4 pl-9 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
				aria-label="Search products"
			/>
		</div>

		<!-- Provider filter -->
		<div class="min-w-40">
			<input
				type="text"
				bind:value={providerFilter}
				onchange={applyFilters}
				placeholder="Filter by provider…"
				class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
				aria-label="Filter by delivery provider"
			/>
		</div>

		<!-- Low stock toggle -->
		<label class="flex cursor-pointer items-center gap-2 text-sm">
			<input
				type="checkbox"
				bind:checked={lowStockFilter}
				onchange={applyFilters}
				class="border-input rounded"
			/>
			<span class="text-foreground font-medium">Low stock only</span>
		</label>

		{#if hasFilters}
			<button
				type="button"
				onclick={clearFilters}
				class="text-muted-foreground hover:text-foreground text-sm transition-colors"
			>
				Clear filters
			</button>
		{/if}
	</div>

	<!-- Products table -->
	<div class="bg-card border-border overflow-hidden rounded-xl border shadow-sm">
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-border border-b">
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Brand</th>
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Size</th>
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Pattern</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Stock</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Cost</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Retail</th>
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Provider</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-border divide-y">
					{#each data.products as product (product.id)}
						<tr class="hover:bg-muted/40 transition-colors">
							<td class="text-foreground px-4 py-3 font-medium">{product.brand}</td>
							<td class="text-foreground px-4 py-3">{product.size}</td>
							<td class="text-muted-foreground px-4 py-3">{product.pattern}</td>
							<td class="px-4 py-3 text-right">
								<span class={['inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium', stockBadgeClass(product)].join(' ')}>
									{product.quantity}
								</span>
							</td>
							<td class="text-foreground px-4 py-3 text-right tabular-nums">{formatCurrency(product.costPrice)}</td>
							<td class="text-foreground px-4 py-3 text-right tabular-nums">{formatCurrency(product.retailPrice)}</td>
							<td class="text-muted-foreground px-4 py-3">{product.deliveryProvider}</td>
							<td class="px-4 py-3">
								<div class="flex items-center justify-end gap-2">
									<button
										type="button"
										onclick={() => openEdit(product)}
										class="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
										aria-label="Edit {product.brand} {product.size}"
									>
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
											<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
										</svg>
									</button>
									<button
										type="button"
										onclick={() => openArchive(product)}
										class="text-muted-foreground hover:text-destructive rounded p-1 transition-colors"
										aria-label="Archive {product.brand} {product.size}"
									>
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
											<path stroke-linecap="round" stroke-linejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2L19 8" />
										</svg>
									</button>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="8" class="text-muted-foreground px-4 py-12 text-center text-sm">
								{hasFilters ? 'No products match the current filters.' : 'No products yet. Add your first product to get started.'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		{#if data.products.length === 25}
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
<ProductFormModal
	bind:open={createModalOpen}
	formData={data.form}
	providers={data.providers}
	onclose={() => (createModalOpen = false)}
/>

{#if selectedProduct}
	<ProductFormModal
		bind:open={editModalOpen}
		formData={data.form}
		providers={data.providers}
		editProduct={selectedProduct}
		onclose={() => { editModalOpen = false; selectedProduct = null; }}
	/>

	<ArchiveProductModal
		bind:open={archiveModalOpen}
		productName="{selectedProduct.brand} {selectedProduct.size} {selectedProduct.pattern}"
		productId={selectedProduct.id}
		onclose={() => { archiveModalOpen = false; selectedProduct = null; }}
	/>
{/if}
