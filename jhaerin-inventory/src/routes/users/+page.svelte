<script lang="ts">
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import UserFormModal from '$lib/components/modals/UserFormModal.svelte';
	import ConfirmDeactivateModal from '$lib/components/modals/ConfirmDeactivateModal.svelte';
	import ConfirmDeleteModal from '$lib/components/modals/ConfirmDeleteModal.svelte';
	import type { PageData } from './$types';
	import type { User } from '$lib/server/db/schema';

	let { data }: { data: PageData } = $props();

	// ── Modal state ──────────────────────────────────────────────────────────
	let createModalOpen = $state(false);
	let editModalOpen = $state(false);
	let deactivateModalOpen = $state(false);
	let deleteModalOpen = $state(false);

	let selectedUser = $state<User | null>(null);

	function openEdit(user: User) {
		selectedUser = user;
		editModalOpen = true;
	}

	function openDeactivate(user: User) {
		selectedUser = user;
		deactivateModalOpen = true;
	}

	function openDelete(user: User) {
		selectedUser = user;
		deleteModalOpen = true;
	}

	// ── Search ───────────────────────────────────────────────────────────────
	let searchValue = $state(data.search);
	let searchTimeout: ReturnType<typeof setTimeout>;

	function handleSearch() {
		clearTimeout(searchTimeout);
		searchTimeout = setTimeout(() => {
			const url = new URL($page.url);
			if (searchValue) {
				url.searchParams.set('search', searchValue);
			} else {
				url.searchParams.delete('search');
			}
			url.searchParams.delete('page');
			goto(url.toString(), { replaceState: true });
		}, 300);
	}

	// ── Pagination ───────────────────────────────────────────────────────────
	function goToPage(p: number) {
		const url = new URL($page.url);
		url.searchParams.set('page', String(p));
		goto(url.toString());
	}

	// ── Activity log filters ─────────────────────────────────────────────────
	let logUserFilter = $state($page.url.searchParams.get('logUser') ?? '');
	let logFromFilter = $state($page.url.searchParams.get('logFrom') ?? '');
	let logToFilter = $state($page.url.searchParams.get('logTo') ?? '');
	let logPage = $state(Math.max(1, Number($page.url.searchParams.get('logPage') ?? '1')));
	const LOG_PAGE_SIZE = 50;

	function applyLogFilters() {
		const url = new URL($page.url);
		if (logUserFilter) url.searchParams.set('logUser', logUserFilter);
		else url.searchParams.delete('logUser');
		if (logFromFilter) url.searchParams.set('logFrom', logFromFilter);
		else url.searchParams.delete('logFrom');
		if (logToFilter) url.searchParams.set('logTo', logToFilter);
		else url.searchParams.delete('logTo');
		url.searchParams.delete('logPage');
		goto(url.toString(), { replaceState: true });
	}

	function clearLogFilters() {
		logUserFilter = '';
		logFromFilter = '';
		logToFilter = '';
		const url = new URL($page.url);
		url.searchParams.delete('logUser');
		url.searchParams.delete('logFrom');
		url.searchParams.delete('logTo');
		url.searchParams.delete('logPage');
		goto(url.toString(), { replaceState: true });
	}

	function goToLogPage(p: number) {
		const url = new URL($page.url);
		url.searchParams.set('logPage', String(p));
		goto(url.toString());
	}

	const hasLogFilters = $derived(
		logUserFilter !== '' || logFromFilter !== '' || logToFilter !== ''
	);

	// ── Helpers ──────────────────────────────────────────────────────────────
	function formatDate(date: Date | string) {
		return new Date(date).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric'
		});
	}
</script>

<svelte:head>
	<title>User Management — Jhaerin Tire Supply</title>
</svelte:head>

<div class="space-y-6 p-6">
	<!-- Page header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-foreground text-2xl font-bold">User Management</h1>
			<p class="text-muted-foreground mt-1 text-sm">Manage staff accounts and view activity logs</p>
		</div>
		<button
			type="button"
			onclick={() => (createModalOpen = true)}
			class="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none"
		>
			<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
			</svg>
			Add user
		</button>
	</div>

	<!-- Search bar -->
	<div class="relative max-w-sm">
		<svg
			class="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2"
			aria-hidden="true"
		>
			<circle cx="11" cy="11" r="8" />
			<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-4.35-4.35" />
		</svg>
		<input
			type="search"
			bind:value={searchValue}
			oninput={handleSearch}
			placeholder="Search by email…"
			class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border py-2 pr-4 pl-9 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
			aria-label="Search users"
		/>
	</div>

	<!-- Users table -->
	<div class="bg-card border-border overflow-hidden rounded-xl border shadow-sm">
		<div class="overflow-x-auto">
			<table class="w-full text-sm">
				<thead>
					<tr class="border-border border-b">
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Name</th>
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Email</th>
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Role</th>
						<th class="text-muted-foreground px-4 py-3 text-left font-medium">Created</th>
						<th class="text-muted-foreground px-4 py-3 text-right font-medium">Actions</th>
					</tr>
				</thead>
				<tbody class="divide-border divide-y">
					{#each data.users as user (user.id)}
						<tr class="hover:bg-muted/40 transition-colors">
							<td class="text-foreground px-4 py-3 font-medium">{user.name || '—'}</td>
							<td class="text-foreground px-4 py-3">{user.email}</td>
							<td class="px-4 py-3">
								<span
									class={[
										'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
										user.role === 'Owner'
											? 'bg-primary/10 text-primary'
											: 'bg-muted text-muted-foreground'
									].join(' ')}
								>
									{user.role}
								</span>
							</td>
							<td class="text-muted-foreground px-4 py-3">{formatDate(user.createdAt)}</td>
							<td class="px-4 py-3">
								<div class="flex items-center justify-end gap-2">
									<button
										type="button"
										onclick={() => openEdit(user)}
										class="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
										aria-label="Edit {user.email}"
									>
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
											<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
										</svg>
									</button>
									<button
										type="button"
										onclick={() => openDeactivate(user)}
										class="text-muted-foreground hover:text-foreground rounded p-1 transition-colors"
										aria-label="Deactivate {user.email}"
									>
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
											<path stroke-linecap="round" stroke-linejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
										</svg>
									</button>
									<button
										type="button"
										onclick={() => openDelete(user)}
										class="text-destructive hover:text-destructive/80 rounded p-1 transition-colors"
										aria-label="Delete {user.email}"
									>
										<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
											<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
										</svg>
									</button>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="5" class="text-muted-foreground px-4 py-10 text-center text-sm">
								{data.search ? 'No users match your search.' : 'No users found.'}
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		{#if data.users.length === 20}
			<div class="border-border flex items-center justify-between border-t px-4 py-3">
				<p class="text-muted-foreground text-sm">Page {data.page}</p>
				<div class="flex gap-2">
					{#if data.page > 1}
						<button
							type="button"
							onclick={() => goToPage(data.page - 1)}
							class="border-border text-foreground hover:bg-muted rounded-lg border px-3 py-1.5 text-sm transition-colors"
						>
							Previous
						</button>
					{/if}
					<button
						type="button"
						onclick={() => goToPage(data.page + 1)}
						class="border-border text-foreground hover:bg-muted rounded-lg border px-3 py-1.5 text-sm transition-colors"
					>
						Next
					</button>
				</div>
			</div>
		{/if}
	</div>

	<!-- Activity log section -->
	<div class="space-y-3">
		<div class="flex items-center justify-between">
			<h2 class="text-foreground text-lg font-semibold">Activity Log</h2>
			{#if hasLogFilters}
				<button
					type="button"
					onclick={clearLogFilters}
					class="text-muted-foreground hover:text-foreground text-sm transition-colors"
				>
					Clear filters
				</button>
			{/if}
		</div>

		<!-- Log filters -->
		<div class="bg-card border-border flex flex-wrap items-end gap-3 rounded-xl border p-4 shadow-sm">
			<!-- User filter -->
			<div class="min-w-48 flex-1 space-y-1">
				<label for="log-user" class="text-foreground block text-xs font-medium">Filter by user</label>
				<select
					id="log-user"
					bind:value={logUserFilter}
					class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
				>
					<option value="">All users</option>
					{#each data.users as user (user.id)}
						<option value={user.id}>{user.email}</option>
					{/each}
				</select>
			</div>

			<!-- Date from -->
			<div class="min-w-36 flex-1 space-y-1">
				<label for="log-from" class="text-foreground block text-xs font-medium">From</label>
				<input
					id="log-from"
					type="date"
					bind:value={logFromFilter}
					class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
				/>
			</div>

			<!-- Date to -->
			<div class="min-w-36 flex-1 space-y-1">
				<label for="log-to" class="text-foreground block text-xs font-medium">To</label>
				<input
					id="log-to"
					type="date"
					bind:value={logToFilter}
					class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
				/>
			</div>

			<button
				type="button"
				onclick={applyLogFilters}
				class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
			>
				Apply
			</button>
		</div>

		<!-- Log table -->
		<div class="bg-card border-border overflow-hidden rounded-xl border shadow-sm">
			<div class="overflow-x-auto">
				<table class="w-full text-sm">
					<thead>
						<tr class="border-border border-b">
							<th class="text-muted-foreground px-4 py-3 text-left font-medium">User ID</th>
							<th class="text-muted-foreground px-4 py-3 text-left font-medium">Action</th>
							<th class="text-muted-foreground px-4 py-3 text-left font-medium">Date</th>
						</tr>
					</thead>
					<tbody class="divide-border divide-y">
						{#each data.activityLogs as log (log.id)}
							<tr class="hover:bg-muted/40 transition-colors">
								<td class="text-muted-foreground px-4 py-3 font-mono text-xs">{log.userId}</td>
								<td class="text-foreground px-4 py-3">{log.action}</td>
								<td class="text-muted-foreground px-4 py-3 whitespace-nowrap">{formatDate(log.createdAt)}</td>
							</tr>
						{:else}
							<tr>
								<td colspan="3" class="text-muted-foreground px-4 py-10 text-center text-sm">
									{hasLogFilters ? 'No activity matches the selected filters.' : 'No activity recorded yet.'}
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>

			<!-- Log pagination -->
			{#if data.activityLogs.length === LOG_PAGE_SIZE}
				<div class="border-border flex items-center justify-between border-t px-4 py-3">
					<p class="text-muted-foreground text-sm">Page {logPage}</p>
					<div class="flex gap-2">
						{#if logPage > 1}
							<button
								type="button"
								onclick={() => goToLogPage(logPage - 1)}
								class="border-border text-foreground hover:bg-muted rounded-lg border px-3 py-1.5 text-sm transition-colors"
							>
								Previous
							</button>
						{/if}
						<button
							type="button"
							onclick={() => goToLogPage(logPage + 1)}
							class="border-border text-foreground hover:bg-muted rounded-lg border px-3 py-1.5 text-sm transition-colors"
						>
							Next
						</button>
					</div>
				</div>
			{/if}
		</div>
	</div>
</div>

<!-- Modals -->
<UserFormModal
	bind:open={createModalOpen}
	formData={data.createForm}
	onclose={() => (createModalOpen = false)}
/>

{#if selectedUser}
	<UserFormModal
		bind:open={editModalOpen}
		formData={data.createForm}
		editUser={selectedUser}
		onclose={() => { editModalOpen = false; selectedUser = null; }}
	/>

	<ConfirmDeactivateModal
		bind:open={deactivateModalOpen}
		userName={selectedUser.email}
		userId={selectedUser.id}
		onclose={() => { deactivateModalOpen = false; selectedUser = null; }}
	/>

	<ConfirmDeleteModal
		bind:open={deleteModalOpen}
		userName={selectedUser.email}
		userId={selectedUser.id}
		onclose={() => { deleteModalOpen = false; selectedUser = null; }}
	/>
{/if}
