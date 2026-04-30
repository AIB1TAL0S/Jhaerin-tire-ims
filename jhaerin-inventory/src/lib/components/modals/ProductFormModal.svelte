<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client as zodClient } from 'sveltekit-superforms/adapters';
	import { productSchema } from '$lib/schemas/product';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import type { ProductSchema } from '$lib/schemas/product';
	import type { Product, DeliveryProvider } from '$lib/server/db/schema';

	interface Props {
		open: boolean;
		formData: SuperValidated<Infer<ProductSchema>>;
		providers: DeliveryProvider[];
		editProduct?: Product | null;
		onclose: () => void;
	}

	let { open = $bindable(), formData, providers, editProduct = null, onclose }: Props = $props();

	const isEdit = $derived(editProduct !== null);

	const { form, errors, message, enhance, submitting, reset } = superForm(formData, {
		validators: zodClient(productSchema),
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
		if (editProduct) {
			$form.brand = editProduct.brand;
			$form.size = editProduct.size;
			$form.pattern = editProduct.pattern;
			$form.quantity = editProduct.quantity;
			$form.costPrice = Number(editProduct.costPrice);
			$form.retailPrice = Number(editProduct.retailPrice);
			$form.deliveryProvider = editProduct.deliveryProvider;
			$form.lowStockThreshold = editProduct.lowStockThreshold;
		} else {
			reset();
		}
	});
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
		role="presentation"
		onclick={() => { open = false; onclose(); }}
	></div>

	<!-- Sheet-style dialog (wider for product form) -->
	<div
		class="bg-card border-border fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-xl"
		role="dialog"
		aria-modal="true"
		aria-labelledby="product-modal-title"
	>
		<!-- Header -->
		<div class="mb-5 flex items-center justify-between">
			<h2 id="product-modal-title" class="text-foreground text-lg font-semibold">
				{isEdit ? 'Edit Product' : 'Add Product'}
			</h2>
			<button
				type="button"
				onclick={() => { open = false; onclose(); }}
				class="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
				aria-label="Close dialog"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		{#if $message?.type === 'error'}
			<div class="bg-destructive/10 border-destructive/30 text-destructive mb-4 rounded-lg border px-4 py-3 text-sm" role="alert">
				{$message.text}
			</div>
		{/if}

		<form
			method="POST"
			action={isEdit ? '?/updateProduct' : '?/createProduct'}
			use:enhance
			class="space-y-4"
		>
			{#if isEdit}
				<input type="hidden" name="productId" value={editProduct?.id} />
			{/if}

			<!-- Brand / Size / Pattern row -->
			<div class="grid grid-cols-3 gap-3">
				<div class="space-y-1.5">
					<label for="p-brand" class="text-foreground block text-sm font-medium">Brand</label>
					<input
						id="p-brand" name="brand" type="text"
						bind:value={$form.brand}
						aria-invalid={$errors.brand ? 'true' : undefined}
						class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
						placeholder="Bridgestone"
					/>
					{#if $errors.brand}<p class="text-destructive text-xs" role="alert">{$errors.brand}</p>{/if}
				</div>
				<div class="space-y-1.5">
					<label for="p-size" class="text-foreground block text-sm font-medium">Size</label>
					<input
						id="p-size" name="size" type="text"
						bind:value={$form.size}
						aria-invalid={$errors.size ? 'true' : undefined}
						class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
						placeholder="205/55R16"
					/>
					{#if $errors.size}<p class="text-destructive text-xs" role="alert">{$errors.size}</p>{/if}
				</div>
				<div class="space-y-1.5">
					<label for="p-pattern" class="text-foreground block text-sm font-medium">Pattern</label>
					<input
						id="p-pattern" name="pattern" type="text"
						bind:value={$form.pattern}
						aria-invalid={$errors.pattern ? 'true' : undefined}
						class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
						placeholder="Ecopia EP300"
					/>
					{#if $errors.pattern}<p class="text-destructive text-xs" role="alert">{$errors.pattern}</p>{/if}
				</div>
			</div>

			<!-- Quantity / Low stock threshold -->
			<div class="grid grid-cols-2 gap-3">
				<div class="space-y-1.5">
					<label for="p-qty" class="text-foreground block text-sm font-medium">Quantity</label>
					<input
						id="p-qty" name="quantity" type="number" min="0" step="1"
						bind:value={$form.quantity}
						aria-invalid={$errors.quantity ? 'true' : undefined}
						class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
					/>
					{#if $errors.quantity}<p class="text-destructive text-xs" role="alert">{$errors.quantity}</p>{/if}
				</div>
				<div class="space-y-1.5">
					<label for="p-threshold" class="text-foreground block text-sm font-medium">Low stock threshold</label>
					<input
						id="p-threshold" name="lowStockThreshold" type="number" min="0" step="1"
						bind:value={$form.lowStockThreshold}
						aria-invalid={$errors.lowStockThreshold ? 'true' : undefined}
						class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
					/>
					{#if $errors.lowStockThreshold}<p class="text-destructive text-xs" role="alert">{$errors.lowStockThreshold}</p>{/if}
				</div>
			</div>

			<!-- Cost price / Retail price -->
			<div class="grid grid-cols-2 gap-3">
				<div class="space-y-1.5">
					<label for="p-cost" class="text-foreground block text-sm font-medium">Cost price</label>
					<input
						id="p-cost" name="costPrice" type="number" min="0.01" step="0.01"
						bind:value={$form.costPrice}
						aria-invalid={$errors.costPrice ? 'true' : undefined}
						class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
						placeholder="0.00"
					/>
					{#if $errors.costPrice}<p class="text-destructive text-xs" role="alert">{$errors.costPrice}</p>{/if}
				</div>
				<div class="space-y-1.5">
					<label for="p-retail" class="text-foreground block text-sm font-medium">Retail price</label>
					<input
						id="p-retail" name="retailPrice" type="number" min="0.01" step="0.01"
						bind:value={$form.retailPrice}
						aria-invalid={$errors.retailPrice ? 'true' : undefined}
						class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
						placeholder="0.00"
					/>
					{#if $errors.retailPrice}<p class="text-destructive text-xs" role="alert">{$errors.retailPrice}</p>{/if}
				</div>
			</div>

			<!-- Delivery provider -->
			<div class="space-y-1.5">
				<label for="p-provider" class="text-foreground block text-sm font-medium">Delivery provider</label>
				<select
					id="p-provider" name="deliveryProvider"
					bind:value={$form.deliveryProvider}
					aria-invalid={$errors.deliveryProvider ? 'true' : undefined}
					class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
				>
					<option value="">Select provider…</option>
					{#each providers as p (p.id)}
						<option value={p.name}>{p.name}</option>
					{/each}
				</select>
				{#if $errors.deliveryProvider}<p class="text-destructive text-xs" role="alert">{$errors.deliveryProvider}</p>{/if}
			</div>

			<!-- Actions -->
			<div class="flex justify-end gap-3 pt-2">
				<button
					type="button"
					onclick={() => { open = false; onclose(); }}
					class="border-border text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={$submitting}
					class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
				>
					{$submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add product'}
				</button>
			</div>
		</form>
	</div>
{/if}
