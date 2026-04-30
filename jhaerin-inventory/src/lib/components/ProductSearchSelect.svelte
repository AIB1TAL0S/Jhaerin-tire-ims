<script lang="ts">
	import type { Product } from '$lib/server/db/schema';

	interface Props {
		products: Product[];
		value: string;
		name: string;
		id?: string;
		placeholder?: string;
		ariaInvalid?: boolean;
		onchange?: (productId: string) => void;
	}

	let {
		products,
		value = $bindable(),
		name,
		id = 'product-search',
		placeholder = 'Search product…',
		ariaInvalid = false,
		onchange
	}: Props = $props();

	let searchQuery = $state('');
	let isOpen = $state(false);
	let inputRef = $state<HTMLInputElement | null>(null);

	const selectedProduct = $derived(products.find((p) => p.id === value));

	const filtered = $derived(
		searchQuery.trim() === ''
			? products
			: products.filter((p) => {
					const q = searchQuery.toLowerCase();
					return (
						p.brand.toLowerCase().includes(q) ||
						p.size.toLowerCase().includes(q) ||
						p.pattern.toLowerCase().includes(q)
					);
				})
	);

	function selectProduct(product: Product) {
		value = product.id;
		searchQuery = '';
		isOpen = false;
		onchange?.(product.id);
	}

	function handleInputFocus() {
		isOpen = true;
		searchQuery = '';
	}

	function handleInputBlur() {
		// Delay to allow click on option to register
		setTimeout(() => {
			isOpen = false;
			searchQuery = '';
		}, 150);
	}

	function productLabel(p: Product) {
		return `${p.brand} ${p.size} — ${p.pattern}`;
	}
</script>

<!-- Hidden input for form submission -->
<input type="hidden" {name} {value} />

<div class="relative">
	<!-- Display input -->
	<input
		bind:this={inputRef}
		{id}
		type="text"
		autocomplete="off"
		aria-invalid={ariaInvalid ? 'true' : undefined}
		aria-expanded={isOpen}
		aria-haspopup="listbox"
		role="combobox"
		value={isOpen ? searchQuery : (selectedProduct ? productLabel(selectedProduct) : '')}
		oninput={(e) => { searchQuery = (e.target as HTMLInputElement).value; }}
		onfocus={handleInputFocus}
		onblur={handleInputBlur}
		placeholder={selectedProduct ? productLabel(selectedProduct) : placeholder}
		class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
	/>

	<!-- Search icon -->
	<svg
		class="text-muted-foreground pointer-events-none absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2"
		fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"
	>
		<circle cx="11" cy="11" r="8" />
		<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35" />
	</svg>

	<!-- Dropdown -->
	{#if isOpen}
		<ul
			role="listbox"
			class="bg-card border-border absolute z-50 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border shadow-lg"
		>
			{#each filtered as product (product.id)}
				<li
					role="option"
					aria-selected={product.id === value}
					class={[
						'flex cursor-pointer items-center justify-between px-3 py-2 text-sm transition-colors',
						product.id === value
							? 'bg-primary/10 text-primary'
							: 'text-foreground hover:bg-muted'
					].join(' ')}
					onmousedown={() => selectProduct(product)}
				>
					<span>
						<span class="font-medium">{product.brand} {product.size}</span>
						<span class="text-muted-foreground ml-1 text-xs">{product.pattern}</span>
					</span>
					<span class="text-muted-foreground ml-2 shrink-0 text-xs tabular-nums">
						{product.quantity} in stock
					</span>
				</li>
			{:else}
				<li class="text-muted-foreground px-3 py-4 text-center text-sm">No products found.</li>
			{/each}
		</ul>
	{/if}
</div>
