<script lang="ts">
	interface Props {
		open: boolean;
		from: string;
		to: string;
		onclose: () => void;
	}

	let { open = $bindable(), from, to, onclose }: Props = $props();

	let reportType = $state('summary');
	let submitting = $state(false);
	let downloadUrl = $state<string | null>(null);
	let errorMsg = $state<string | null>(null);

	async function handleExport() {
		submitting = true;
		downloadUrl = null;
		errorMsg = null;

		const formData = new FormData();
		formData.set('from', from);
		formData.set('to', to);
		formData.set('reportType', reportType);

		try {
			const res = await fetch('?/exportPdf', { method: 'POST', body: formData });
			const json = await res.json() as { error?: string; data?: { downloadUrl?: string } };

			if (!res.ok || json?.error) {
				errorMsg = json?.error ?? 'Export failed. Please try again.';
			} else {
				downloadUrl = json?.data?.downloadUrl ?? null;
			}
		} catch {
			errorMsg = 'Export failed. Please try again.';
		} finally {
			submitting = false;
		}
	}

	function handleClose() {
		downloadUrl = null;
		errorMsg = null;
		open = false;
		onclose();
	}
</script>

{#if open}
	<div class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" role="presentation" onclick={handleClose}></div>

	<div
		class="bg-card border-border fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-xl"
		role="dialog" aria-modal="true" aria-labelledby="export-modal-title"
	>
		<div class="mb-5 flex items-center justify-between">
			<h2 id="export-modal-title" class="text-foreground text-lg font-semibold">Export Report</h2>
			<button type="button" onclick={handleClose} class="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors" aria-label="Close">
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
			</button>
		</div>

		{#if errorMsg}
			<div class="bg-destructive/10 border-destructive/30 text-destructive mb-4 rounded-lg border px-4 py-3 text-sm" role="alert">{errorMsg}</div>
		{/if}

		{#if downloadUrl}
			<!-- Success state -->
			<div class="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200" role="status">
				Your report is ready.
			</div>
			<a
				href={downloadUrl}
				target="_blank"
				rel="noopener noreferrer"
				class="bg-primary text-primary-foreground hover:bg-primary/90 mb-4 flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
				Download Report
			</a>
			<p class="text-muted-foreground text-center text-xs">Link expires in 1 hour.</p>
			<div class="mt-4 flex justify-end">
				<button type="button" onclick={handleClose} class="border-border text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors">Close</button>
			</div>
		{:else}
			<!-- Config form -->
			<div class="space-y-4">
				<div class="space-y-1.5">
					<p class="text-foreground text-sm font-medium">Period</p>
					<p class="text-muted-foreground text-sm">{from} → {to}</p>
				</div>

				<div class="space-y-1.5">
					<label for="report-type" class="text-foreground block text-sm font-medium">Report type</label>
					<select id="report-type" bind:value={reportType}
						class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none">
						<option value="summary">Full Summary (Sales + Inventory)</option>
						<option value="sales">Sales Report Only</option>
						<option value="inventory">Inventory Value Only</option>
					</select>
				</div>

				<div class="flex justify-end gap-3 pt-2">
					<button type="button" onclick={handleClose} class="border-border text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors">Cancel</button>
					<button type="button" onclick={handleExport} disabled={submitting}
						class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60">
						{#if submitting}
							<svg class="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path></svg>
							Generating…
						{:else}
							Export
						{/if}
					</button>
				</div>
			</div>
		{/if}
	</div>
{/if}
