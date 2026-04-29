<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client as zodClient } from 'sveltekit-superforms/adapters';
	import { stockOutSchema } from '$lib/schemas/stockOut';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import type { StockOutSchema } from '$lib/schemas/stockOut';
	import type { StockOut, Product } from '$lib/server/db/schema';

	interface Props {
		open: boolean;
		formData: SuperValidated<Infer<StockOutSchema>>;
		products: Product[];
		editRecord?: StockOut | null;
		onclose: () => void;
	}

	let { open = $bindable(), formData, products, editRecord = null, onclose }: Props = $props();

	const isEdit = $derived(editRecord !== null);

	const { form, errors, message, enhance, submitting, reset } = superForm(formData, {
		validators: zodClient(stockOutSchema),
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
			$form.reason = editRecord.reason;
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
		role="dialog" aria-modal="true" aria-labelledby="stockout-modal-title"
	>
		<div class="mb-5 flex items-center justify-between">
			<h2 id="stockout-modal-title" class="text-foreground text-lg font-semibold">
				{isEdit ? 'Edit Stock-Out' : 'Record Stock-Out'}
			</h2>
			<button type="button" onclick={() => { open = false; onclose(); }} class="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors" aria-label="Close">
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
			</button>
		</div>

		{#if $message?.type === 'error'}
			<div class="bg-destructive/10 border-destructive/30 text-destructive mb-4 rounded-lg border px-4 py-3 text-sm" role="alert">{$message.text}</div>
		{/if}

		<form method="POST" action={isEdit ? '?/updateStockOut' : '?/createStockOut'} use:enhance class="space-y-4">
			{#if isEdit}
				<input type="hidden" name="recordId" value={editRecord?.id} />
			{/if}

			<!-- Product -->
			<div class="space-y-1.5">
				<label for="so-product" class="text-foreground block text-sm font-medium">Product</label>
				<select id="so-product" name="productId" bind:value={$form.productId} aria-invalid={$errors.productId ? 'true' : undefined}
					class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none">
					<option value="">Select a product…</option>
					{#each products as p (p.id)}
						<option value={p.id}>{p.brand} {p.size} — {p.pattern} (stock: {p.quantity})</option>
					{/each}
				</select>
				{#if $errors.productId}<p class="text-destructive text-xs" role="alert">{$errors.productId}</p>{/if}
			</div>

			<!-- Quantity -->
			<div class="space-y-1.5">
				<label for="so-qty" class="text-foreground block text-sm font-medium">Quantity</label>
				<input id="so-qty" name="quantity" type="number" min="1" step="1" bind:value={$form.quantity} aria-invalid={$errors.quantity ? 'true' : undefined}
					class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none" />
				{#if $errors.quantity}<p class="text-destructive text-xs" role="alert">{$errors.quantity}</p>{/if}
			</div>

			<!-- Reason -->
			<div class="space-y-1.5">
				<label for="so-reason" class="text-foreground block text-sm font-medium">Reason</label>
				<input id="so-reason" name="reason" type="text" bind:value={$form.reason} aria-invalid={$errors.reason ? 'true' : undefined}
					class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
					placeholder="e.g. Damaged, Returned, Transferred" />
				{#if $errors.reason}<p class="text-destructive text-xs" role="alert">{$errors.reason}</p>{/if}
			</div>

			<!-- Date -->
			<div class="space-y-1.5">
				<label for="so-date" class="text-foreground block text-sm font-medium">Date</label>
				<input id="so-date" name="date" type="date" value={$form.date ? new Date($form.date).toISOString().split('T')[0] : todayISO()}
					oninput={(e) => { $form.date = new Date((e.target as HTMLInputElement).value); }}
					aria-invalid={$errors.date ? 'true' : undefined}
					class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none" />
				{#if $errors.date}<p class="text-destructive text-xs" role="alert">{$errors.date}</p>{/if}
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
