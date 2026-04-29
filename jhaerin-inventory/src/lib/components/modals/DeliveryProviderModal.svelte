<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client as zodClient } from 'sveltekit-superforms/adapters';
	import { deliveryProviderSchema } from '$lib/schemas/settings';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import type { DeliveryProviderSchema } from '$lib/schemas/settings';
	import type { DeliveryProvider } from '$lib/server/db/schema';

	interface Props {
		open: boolean;
		formData: SuperValidated<Infer<DeliveryProviderSchema>>;
		editProvider?: DeliveryProvider | null;
		onclose: () => void;
	}

	let { open = $bindable(), formData, editProvider = null, onclose }: Props = $props();

	const isEdit = $derived(editProvider !== null);

	const { form, errors, message, enhance, submitting, reset } = superForm(formData, {
		validators: zodClient(deliveryProviderSchema),
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
		if (editProvider) {
			$form.name = editProvider.name;
		} else {
			reset();
		}
	});
</script>

{#if open}
	<div class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" role="presentation" onclick={() => { open = false; onclose(); }}></div>

	<div
		class="bg-card border-border fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-xl"
		role="dialog" aria-modal="true" aria-labelledby="provider-modal-title"
	>
		<div class="mb-5 flex items-center justify-between">
			<h2 id="provider-modal-title" class="text-foreground text-lg font-semibold">
				{isEdit ? 'Edit Provider' : 'Add Provider'}
			</h2>
			<button type="button" onclick={() => { open = false; onclose(); }} class="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors" aria-label="Close">
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
			</button>
		</div>

		{#if $message?.type === 'error'}
			<div class="bg-destructive/10 border-destructive/30 text-destructive mb-4 rounded-lg border px-4 py-3 text-sm" role="alert">{$message.text}</div>
		{/if}

		<form
			method="POST"
			action={isEdit ? '?/updateDeliveryProvider' : '?/createDeliveryProvider'}
			use:enhance
			class="space-y-4"
		>
			{#if isEdit}
				<input type="hidden" name="providerId" value={editProvider?.id} />
			{/if}

			<div class="space-y-1.5">
				<label for="provider-name" class="text-foreground block text-sm font-medium">Provider name</label>
				<input
					id="provider-name" name="name" type="text"
					bind:value={$form.name}
					aria-invalid={$errors.name ? 'true' : undefined}
					class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
					placeholder="e.g. Bridgestone Direct"
				/>
				{#if $errors.name}<p class="text-destructive text-xs" role="alert">{$errors.name}</p>{/if}
			</div>

			<div class="flex justify-end gap-3 pt-2">
				<button type="button" onclick={() => { open = false; onclose(); }} class="border-border text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors">Cancel</button>
				<button type="submit" disabled={$submitting} class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60">
					{$submitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add provider'}
				</button>
			</div>
		</form>
	</div>
{/if}
