<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client as zodClient } from 'sveltekit-superforms/adapters';
	import { settingsSchema } from '$lib/schemas/settings';
	import DeliveryProviderModal from '$lib/components/modals/DeliveryProviderModal.svelte';
	import type { PageData } from './$types';
	import type { DeliveryProvider } from '$lib/server/db/schema';

	let { data }: { data: PageData } = $props();

	// ── Settings form ────────────────────────────────────────────────────────
	const { form, errors, message, enhance, submitting } = superForm(data.settingsForm, {
		validators: zodClient(settingsSchema),
		delayMs: 0
	});

	// ── Delivery provider modals ─────────────────────────────────────────────
	let createProviderOpen = $state(false);
	let editProviderOpen = $state(false);
	let deleteProviderOpen = $state(false);
	let selectedProvider = $state<DeliveryProvider | null>(null);
	let deleteError = $state<string | null>(null);
	let deleteSubmitting = $state(false);

	// ── Restore modal ────────────────────────────────────────────────────────
	let restoreOpen = $state(false);
	let restoreSubmitting = $state(false);
	let restoreError = $state<string | null>(null);

	async function handleRestore() {
		restoreSubmitting = true;
		restoreError = null;
		try {
			// Supabase restore is initiated from the dashboard — this action
			// documents the intent and could call a Supabase Management API endpoint
			// if a service-role key with management scope is available.
			// For now, redirect the owner to the Supabase dashboard.
			window.open('https://supabase.com/dashboard', '_blank', 'noopener,noreferrer');
			restoreOpen = false;
		} catch {
			restoreError = 'Failed to initiate restore. Please use the Supabase Dashboard directly.';
		} finally {
			restoreSubmitting = false;
		}
	}

	async function handleDeleteProvider() {
		if (!selectedProvider) return;
		deleteSubmitting = true;
		deleteError = null;

		const formData = new FormData();
		formData.set('providerId', selectedProvider.id);

		try {
			const res = await fetch('?/deleteDeliveryProvider', { method: 'POST', body: formData });
			const json = await res.json() as { error?: string };

			if (!res.ok || json?.error) {
				deleteError = json?.error ?? 'Failed to delete provider.';
			} else {
				deleteProviderOpen = false;
				selectedProvider = null;
				window.location.reload();
			}
		} finally {
			deleteSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Settings — Jhaerin Tire Supply</title>
</svelte:head>

<div class="space-y-8 p-6">
	<!-- Page header -->
	<div>
		<h1 class="text-foreground text-2xl font-bold">Settings</h1>
		<p class="text-muted-foreground mt-1 text-sm">System configuration and preferences</p>
	</div>

	<!-- Global thresholds -->
	<div class="bg-card border-border rounded-xl border p-6 shadow-sm">
		<h2 class="text-foreground mb-5 text-base font-semibold">Inventory Thresholds</h2>

		{#if $message?.type === 'success'}
			<div class="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200" role="status">{$message.text}</div>
		{/if}
		{#if $message?.type === 'error'}
			<div class="bg-destructive/10 border-destructive/30 text-destructive mb-4 rounded-lg border px-4 py-3 text-sm" role="alert">{$message.text}</div>
		{/if}

		<form method="POST" action="?/updateSettings" use:enhance class="space-y-5">
			<div class="grid grid-cols-1 gap-5 sm:grid-cols-2">
				<!-- Global low stock threshold -->
				<div class="space-y-1.5">
					<label for="s-threshold" class="text-foreground block text-sm font-medium">
						Global low stock threshold
					</label>
					<p class="text-muted-foreground text-xs">Default minimum quantity before a low-stock alert is triggered.</p>
					<input
						id="s-threshold" name="globalLowStockThreshold" type="number" min="0" step="1"
						bind:value={$form.globalLowStockThreshold}
						aria-invalid={$errors.globalLowStockThreshold ? 'true' : undefined}
						class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
					/>
					{#if $errors.globalLowStockThreshold}<p class="text-destructive text-xs" role="alert">{$errors.globalLowStockThreshold}</p>{/if}
				</div>

				<!-- Dead stock days -->
				<div class="space-y-1.5">
					<label for="s-deadstock" class="text-foreground block text-sm font-medium">
						Dead stock period (days)
					</label>
					<p class="text-muted-foreground text-xs">Products with no movement for this many days are flagged as dead stock.</p>
					<input
						id="s-deadstock" name="deadStockDays" type="number" min="1" step="1"
						bind:value={$form.deadStockDays}
						aria-invalid={$errors.deadStockDays ? 'true' : undefined}
						class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
					/>
					{#if $errors.deadStockDays}<p class="text-destructive text-xs" role="alert">{$errors.deadStockDays}</p>{/if}
				</div>
			</div>

			<!-- System preferences -->
			<div class="border-border border-t pt-5">
				<h3 class="text-foreground mb-4 text-sm font-semibold">System Preferences</h3>
				<div class="grid grid-cols-1 gap-5 sm:grid-cols-3">
					<!-- Theme -->
					<div class="space-y-1.5">
						<label for="s-theme" class="text-foreground block text-sm font-medium">Theme</label>
						<select id="s-theme" name="theme" bind:value={$form.theme}
							class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none">
							<option value="dark">Dark</option>
							<option value="light">Light</option>
						</select>
					</div>

					<!-- Date format -->
					<div class="space-y-1.5">
						<label for="s-dateformat" class="text-foreground block text-sm font-medium">Date format</label>
						<select id="s-dateformat" name="dateFormat" bind:value={$form.dateFormat}
							class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none">
							<option value="MM/DD/YYYY">MM/DD/YYYY</option>
							<option value="DD/MM/YYYY">DD/MM/YYYY</option>
							<option value="YYYY-MM-DD">YYYY-MM-DD</option>
						</select>
					</div>

					<!-- Default report range -->
					<div class="space-y-1.5">
						<label for="s-reportrange" class="text-foreground block text-sm font-medium">Default report range</label>
						<select id="s-reportrange" name="defaultReportDateRange" bind:value={$form.defaultReportDateRange}
							class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none">
							<option value="7d">Last 7 days</option>
							<option value="30d">Last 30 days</option>
							<option value="90d">Last 90 days</option>
							<option value="365d">Last 365 days</option>
						</select>
					</div>
				</div>
			</div>

			<div class="flex justify-end pt-2">
				<button type="submit" disabled={$submitting}
					class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-5 py-2 text-sm font-semibold transition-colors disabled:opacity-60">
					{$submitting ? 'Saving…' : 'Save settings'}
				</button>
			</div>
		</form>
	</div>

	<!-- Backup & Restore -->
	<div class="bg-card border-border rounded-xl border p-6 shadow-sm">
		<h2 class="text-foreground mb-1 text-base font-semibold">Database Backup & Restore</h2>
		<p class="text-muted-foreground mb-5 text-sm">
			Backups are managed automatically by Supabase on a scheduled basis.
			Use the restore action below to roll back to a previous backup.
		</p>

		<div class="bg-muted rounded-lg p-4 text-sm">
			<p class="text-foreground font-medium">Backup Status</p>
			<p class="text-muted-foreground mt-1 text-xs">
				Supabase handles automated daily backups for your project. View backup history and
				restore points in the
				<a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer"
					class="text-primary hover:text-primary/80 underline">Supabase Dashboard → Database → Backups</a>.
			</p>
		</div>

		<div class="mt-4">
			<button
				type="button"
				onclick={() => (restoreOpen = true)}
				class="border-destructive text-destructive hover:bg-destructive/10 inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
				</svg>
				Initiate restore
			</button>
		</div>
	</div>

	<!-- Delivery providers -->
	<div class="bg-card border-border rounded-xl border shadow-sm">
		<div class="border-border flex items-center justify-between border-b px-5 py-4">
			<h2 class="text-foreground text-base font-semibold">Delivery Providers</h2>
			<button type="button" onclick={() => (createProviderOpen = true)}
				class="bg-primary text-primary-foreground hover:bg-primary/90 inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors">
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" /></svg>
				Add provider
			</button>
		</div>

		<ul class="divide-border divide-y">
			{#each data.providers as provider (provider.id)}
				<li class="hover:bg-muted/40 flex items-center justify-between px-5 py-3 transition-colors">
					<span class="text-foreground text-sm font-medium">{provider.name}</span>
					<div class="flex items-center gap-2">
						<button type="button" onclick={() => { selectedProvider = provider; editProviderOpen = true; }}
							class="text-muted-foreground hover:text-foreground rounded p-1 transition-colors" aria-label="Edit {provider.name}">
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
						</button>
						<button type="button" onclick={() => { selectedProvider = provider; deleteError = null; deleteProviderOpen = true; }}
							class="text-destructive hover:text-destructive/80 rounded p-1 transition-colors" aria-label="Delete {provider.name}">
							<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
						</button>
					</div>
				</li>
			{:else}
				<li class="text-muted-foreground px-5 py-8 text-center text-sm">No delivery providers yet.</li>
			{/each}
		</ul>
	</div>
</div>

<!-- Restore confirmation AlertDialog -->
{#if restoreOpen}
	<div class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" role="presentation" onclick={() => (restoreOpen = false)}></div>
	<div
		class="bg-card border-border fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-xl"
		role="alertdialog" aria-modal="true" aria-labelledby="restore-title" aria-describedby="restore-desc"
	>
		<h2 id="restore-title" class="text-foreground mb-2 text-lg font-semibold">Initiate database restore?</h2>
		<p id="restore-desc" class="text-muted-foreground mb-4 text-sm">
			This will open the Supabase Dashboard where you can select a backup point and initiate the restore.
			The current database state will be preserved if the restore fails.
		</p>

		{#if restoreError}
			<div class="bg-destructive/10 border-destructive/30 text-destructive mb-4 rounded-lg border px-4 py-3 text-sm" role="alert">{restoreError}</div>
		{/if}

		<div class="flex justify-end gap-3">
			<button type="button" onclick={() => (restoreOpen = false)}
				class="border-border text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors">Cancel</button>
			<button type="button" onclick={handleRestore} disabled={restoreSubmitting}
				class="bg-destructive text-primary-foreground hover:bg-destructive/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60">
				{restoreSubmitting ? 'Opening…' : 'Open Supabase Dashboard'}
			</button>
		</div>
	</div>
{/if}
<DeliveryProviderModal
	bind:open={createProviderOpen}
	formData={data.providerForm}
	onclose={() => (createProviderOpen = false)}
/>

{#if selectedProvider}
	<DeliveryProviderModal
		bind:open={editProviderOpen}
		formData={data.providerForm}
		editProvider={selectedProvider}
		onclose={() => { editProviderOpen = false; selectedProvider = null; }}
	/>

	<!-- Delete confirmation AlertDialog -->
	{#if deleteProviderOpen}
		<div class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" role="presentation" onclick={() => { deleteProviderOpen = false; selectedProvider = null; }}></div>
		<div
			class="bg-card border-border fixed top-1/2 left-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-xl"
			role="alertdialog" aria-modal="true" aria-labelledby="del-provider-title" aria-describedby="del-provider-desc"
		>
			<h2 id="del-provider-title" class="text-foreground mb-2 text-lg font-semibold">Delete provider?</h2>
			<p id="del-provider-desc" class="text-muted-foreground mb-4 text-sm">
				This will permanently delete <strong class="text-foreground">{selectedProvider.name}</strong>. This cannot be undone.
			</p>

			{#if deleteError}
				<div class="bg-destructive/10 border-destructive/30 text-destructive mb-4 rounded-lg border px-4 py-3 text-sm" role="alert">{deleteError}</div>
			{/if}

			<div class="flex justify-end gap-3">
				<button type="button" onclick={() => { deleteProviderOpen = false; selectedProvider = null; }}
					class="border-border text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors">Cancel</button>
				<button type="button" onclick={handleDeleteProvider} disabled={deleteSubmitting}
					class="bg-destructive text-primary-foreground hover:bg-destructive/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60">
					{deleteSubmitting ? 'Deleting…' : 'Delete'}
				</button>
			</div>
		</div>
	{/if}
{/if}
