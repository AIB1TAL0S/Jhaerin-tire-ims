<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client as zodClient } from 'sveltekit-superforms/adapters';
	import { saleSchema } from '$lib/schemas/sale';
	import ProductSearchSelect from '$lib/components/ProductSearchSelect.svelte';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import type { SaleSchema } from '$lib/schemas/sale';
	import type { Product } from '$lib/server/db/schema';

	// Sale row type from getSales (includes joined product fields)
	interface SaleRow {
		id: string;
		productId: string;
		quantitySold: number;
		revenue: string;
		cost: string;
		grossProfit: string | null;
		date: Date;
		createdAt: Date;
		brand: string;
		size: string;
		pattern: string;
	}

	interface Props {
		open: boolean;
		formData: SuperValidated<Infer<SaleSchema>>;
		products: Product[];
		editSale?: SaleRow | null;
		showGrossProfit?: boolean;
		onclose: () => void;
	}

	let { open = $bindable(), formData, products, editSale = null, showGrossProfit = true, onclose }: Props = $props();

	const isEdit = $derived(editSale !== null);

	const { form, errors, message, enhance, submitting, reset } = superForm(formData, {
		validators: zodClient(saleSchema),
		delayMs: 0,
		onResult({ result }) {
			if (result.type === 'success') {
				reset();
				open = false;
				onclose();
			}
		}
	});

	$effect(() => {
		if (editSale) {
			$form.productId = editSale.productId;
			$form.quantitySold = editSale.quantitySold;
			$form.date = new Date(editSale.date);
		} else {
			reset();
		}
	});

	// Live margin preview
	const selectedProduct = $derived(products.find((p) => p.id === $form.productId));
	const previewRevenue = $derived(
		selectedProduct && $form.quantitySold > 0
			? ($form.quantitySold * Number(selectedProduct.retailPrice)).toFixed(2)
			: null
	);
	const previewCost = $derived(
		selectedProduct && $form.quantitySold > 0
			? ($form.quantitySold * Number(selectedProduct.costPrice)).toFixed(2)
			: null
	);
	const previewProfit = $derived(
		previewRevenue !== null && previewCost !== null
			? (Number(previewRevenue) - Number(previewCost)).toFixed(2)
			: null
	);

	function todayISO() {
		return new Date().toISOString().split('T')[0];
	}

	function formatCurrency(v: string | number) {
		return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(Number(v));
	}
</script>

{#if open}
	<div class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" role="presentation" onclick={() => { open = false; onclose(); }}></div>

	<div
		class="bg-card border-border fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-xl"
		role="dialog" aria-modal="true" aria-labelledby="sale-modal-title"
	>
		<div class="mb-5 flex items-center justify-between">
			<h2 id="sale-modal-title" class="text-foreground text-lg font-semibold">
				{isEdit ? 'Edit Sale' : 'Record Sale'}
			</h2>
			<button type="button" onclick={() => { open = false; onclose(); }} class="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors" aria-label="Close">
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
			</button>
		</div>

		{#if $message?.type === 'error'}
			<div class="bg-destructive/10 border-destructive/30 text-destructive mb-4 rounded-lg border px-4 py-3 text-sm" role="alert">{$message.text}</div>
		{/if}

		<form method="POST" action={isEdit ? '?/updateSale' : '?/createSale'} use:enhance class="space-y-4">
			{#if isEdit}
				<input type="hidden" name="saleId" value={editSale?.id} />
			{/if}

			<!-- Product -->
			<div class="space-y-1.5">
				<label for="sale-product" class="text-foreground block text-sm font-medium">Product</label>
				<ProductSearchSelect
					id="sale-product"
					name="productId"
					{products}
					bind:value={$form.productId}
					ariaInvalid={!!$errors.productId}
					placeholder="Search product…"
				/>
				{#if $errors.productId}<p class="text-destructive text-xs" role="alert">{$errors.productId}</p>{/if}
			</div>

			<!-- Quantity sold -->
			<div class="space-y-1.5">
				<label for="sale-qty" class="text-foreground block text-sm font-medium">Quantity sold</label>
				<input id="sale-qty" name="quantitySold" type="number" min="1" step="1" bind:value={$form.quantitySold} aria-invalid={$errors.quantitySold ? 'true' : undefined}
					class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none" />
				{#if $errors.quantitySold}<p class="text-destructive text-xs" role="alert">{$errors.quantitySold}</p>{/if}
			</div>

			<!-- Date -->
			<div class="space-y-1.5">
				<label for="sale-date" class="text-foreground block text-sm font-medium">Date</label>
				<input id="sale-date" name="date" type="date"
					value={$form.date ? new Date($form.date).toISOString().split('T')[0] : todayISO()}
					oninput={(e) => { $form.date = new Date((e.target as HTMLInputElement).value); }}
					aria-invalid={$errors.date ? 'true' : undefined}
					class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none" />
				{#if $errors.date}<p class="text-destructive text-xs" role="alert">{$errors.date}</p>{/if}
			</div>

			<!-- Live financial preview -->
			{#if previewRevenue !== null}
				<div class="bg-muted rounded-lg p-3 text-sm space-y-1">
					<p class="text-muted-foreground font-medium text-xs uppercase tracking-wide">Preview</p>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Revenue</span>
						<span class="text-foreground tabular-nums">{formatCurrency(previewRevenue)}</span>
					</div>
					<div class="flex justify-between">
						<span class="text-muted-foreground">Cost</span>
						<span class="text-foreground tabular-nums">{formatCurrency(previewCost!)}</span>
					</div>
					{#if showGrossProfit}
						<div class="border-border flex justify-between border-t pt-1">
							<span class="text-foreground font-medium">Gross profit</span>
							<span class={['tabular-nums font-semibold', Number(previewProfit) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-destructive'].join(' ')}>
								{formatCurrency(previewProfit!)}
							</span>
						</div>
					{/if}
				</div>
			{/if}

			<div class="flex justify-end gap-3 pt-2">
				<button type="button" onclick={() => { open = false; onclose(); }} class="border-border text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors">Cancel</button>
				<button type="submit" disabled={$submitting} class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60">
					{$submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Record sale'}
				</button>
			</div>
		</form>
	</div>
{/if}
