<script lang="ts">
	interface Props {
		open: boolean;
		userName: string;
		userId: string;
		onclose: () => void;
	}

	let { open = $bindable(), userName, userId, onclose }: Props = $props();

	let submitting = $state(false);

	async function handleDeactivate() {
		submitting = true;
		const formData = new FormData();
		formData.set('userId', userId);

		try {
			const response = await fetch('?/deactivateUser', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				open = false;
				onclose();
				// Reload to reflect updated status
				window.location.reload();
			}
		} finally {
			submitting = false;
		}
	}
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
		role="presentation"
		onclick={() => { open = false; onclose(); }}
	></div>

	<!-- Alert Dialog -->
	<div
		class="bg-card border-border fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-xl"
		role="alertdialog"
		aria-modal="true"
		aria-labelledby="deactivate-title"
		aria-describedby="deactivate-desc"
	>
		<h2 id="deactivate-title" class="text-foreground mb-2 text-lg font-semibold">
			Deactivate account?
		</h2>
		<p id="deactivate-desc" class="text-muted-foreground mb-6 text-sm">
			<strong class="text-foreground">{userName}</strong> will no longer be able to log in. Their data will be preserved and the account can be re-enabled later.
		</p>

		<div class="flex justify-end gap-3">
			<button
				type="button"
				onclick={() => { open = false; onclose(); }}
				class="border-border text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
			>
				Cancel
			</button>
			<button
				type="button"
				onclick={handleDeactivate}
				disabled={submitting}
				class="bg-destructive text-primary-foreground hover:bg-destructive/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
			>
				{submitting ? 'Deactivating…' : 'Deactivate'}
			</button>
		</div>
	</div>
{/if}
