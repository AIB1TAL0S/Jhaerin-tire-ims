<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client as zodClient } from 'sveltekit-superforms/adapters';
	import { stockInSchema } from '$lib/schemas/stockIn';
	import ProductSearchSelect from '$lib/components/ProductSearchSelect.svelte';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import type { StockInSchema } from '$lib/schemas/stockIn';
	import type { StockIn, Product, DeliveryProvider } from '$lib/server/db/schema';

	interface Props {
		open: boolean;
		formData: SuperValidated<Infer<StockInSchema>>;
		products: Product[];
		providers: DeliveryProvider[];
		editRecord?: StockIn | null;
		onclose: () => void;
	}

	let { open = $bindable(), formData, products, providers, editRecord = null, onclose }: Props = $props();

	const isEdit = $derived(editRecord !== null);

	const { form, errors, message, enhance, submitting, reset } = superForm(formData, {
		validators: zodClient(stockInSchema),
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
		if (editRecord) {
			$form.productId = editRecord.productId;
			$form.quantity = editRecord.quantity;
			$form.deliveryProvider = editRecord.deliveryProvider;
			$form.salesInvoiceNumber = editRecord.salesInvoiceNumber ?? '';
			$form.date = new Date(editRecord.date);
		} else {
			reset();
		}
	});

	function todayISO() {
		return new Date().toISOString().split('T')[0];
	}
</script>

{#if open}
	<div class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" role="presentation" onclick={() => { open = false; onclose(); }}></div>

	<div
		class="bg-card border-border fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-xl"
		role="dialog" aria-modal="true" aria-labelledby="stockin-modal-title"
	>
		<div class="mb-5 flex items-center justify-between">
			<h2 id="stockin-modal-title" class="text-foreground text-lg font-semibold">
				{isEdit ? 'Edit Stock-In' : 'Record Stock-In'}
			</h2>
			<button type="button" onclick={() => { open = false; onclose(); }} class="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors" aria-label="Close">
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
			</button>
		</div>

		{#if $message?.type === 'error'}
			<div class="bg-destructive/10 border-destructive/30 text-destructive mb-4 rounded-lg border px-4 py-3 text-sm" role="alert">{$message.text}</div>
		{/if}

		<form method="POST" action={isEdit ? '?/updateStockIn' : '?/createStockIn'} use:enhance class="space-y-4">
			{#if isEdit}
				<input type="hidden" name="recordId" value={editRecord?.id} />
			{/if}

			<!-- Product -->
			<div class="space-y-1.5">
				<label for="si-product" class="text-foreground block text-sm font-medium">Product</label>
				<ProductSearchSelect
					id="si-product"
					name="productId"
					{products}
					bind:value={$form.productId}
					ariaInvalid={!!$errors.productId}
					placeholder="Search product…"
				/>
				{#if $errors.productId}<p class="text-destructive text-xs" role="alert">{$errors.productId}</p>{/if}
			</div>

			<!-- Quantity -->
			<div class="space-y-1.5">
				<label for="si-qty" class="text-foreground block text-sm font-medium">Quantity</label>
				<input id="si-qty" name="quantity" type="number" min="1" step="1" bind:value={$form.quantity} aria-invalid={$errors.quantity ? 'true' : undefined}
					class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none" />
				{#if $errors.quantity}<p class="text-destructive text-xs" role="alert">{$errors.quantity}</p>{/if}
			</div>

			<!-- Delivery provider -->
			<div class="space-y-1.5">
				<label for="si-provider" class="text-foreground block text-sm font-medium">Delivery provider</label>
				<select id="si-provider" name="deliveryProvider" bind:value={$form.deliveryProvider} aria-invalid={$errors.deliveryProvider ? 'true' : undefined}
					class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none">
					<option value="">Select provider…</option>
					{#each providers as p (p.id)}
						<option value={p.name}>{p.name}</option>
					{/each}
				</select>
				{#if $errors.deliveryProvider}<p class="text-destructive text-xs" role="alert">{$errors.deliveryProvider}</p>{/if}
			</div>

			<!-- Delivery invoice receipt -->
			<div class="border-border space-y-4 border-t pt-4">
				<p class="text-muted-foreground text-xs font-medium uppercase tracking-wide">Delivery invoice receipt</p>

				<div class="space-y-1.5">
					<label for="si-invoice" class="text-foreground block text-sm font-medium">Sales invoice number</label>
					<input id="si-invoice" name="salesInvoiceNumber" type="text" bind:value={$form.salesInvoiceNumber} aria-invalid={$errors.salesInvoiceNumber ? 'true' : undefined}
						class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
						placeholder="Enter sales invoice number" />
					{#if $errors.salesInvoiceNumber}<p class="text-destructive text-xs" role="alert">{$errors.salesInvoiceNumber}</p>{/if}
				</div>

				<div class="space-y-1.5">
					<label for="si-date" class="text-foreground block text-sm font-medium">Delivery date <span class="text-destructive">*</span></label>
					<input id="si-date" name="date" type="date" value={$form.date ? new Date($form.date).toISOString().split('T')[0] : todayISO()}
						oninput={(e) => { $form.date = new Date((e.target as HTMLInputElement).value); }}
						aria-invalid={$errors.date ? 'true' : undefined}
						required
						class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none" />
					{#if $errors.date}<p class="text-destructive text-xs" role="alert">{$errors.date}</p>{/if}
				</div>
			</div>

			<div class="flex justify-end gap-3 pt-2">
				<button type="button" onclick={() => { open = false; onclose(); }} class="border-border text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors">Cancel</button>
				<button type="submit" disabled={$submitting} class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60">
					{$submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Record'}
				</button>
			</div>
		</form>
	</div>
{/if}
