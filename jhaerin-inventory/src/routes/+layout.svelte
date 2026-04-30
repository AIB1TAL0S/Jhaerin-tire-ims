<script lang="ts">
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import NotificationModal from '$lib/components/modals/NotificationModal.svelte';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const isAuth = $derived(!data.user);

	// ── Theme ────────────────────────────────────────────────────────────────
	let currentTheme = $state(data.theme ?? 'dark');

	$effect(() => {
		currentTheme = data.theme ?? 'dark';
	});

	$effect(() => {
		if (typeof document !== 'undefined') {
			if (currentTheme === 'dark') {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		}
	});

	async function toggleTheme() {
		const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
		currentTheme = newTheme;

		// Persist to settings
		const formData = new FormData();
		formData.set('globalLowStockThreshold', '5');
		formData.set('deadStockDays', '90');
		formData.set('theme', newTheme);
		formData.set('dateFormat', 'MM/DD/YYYY');
		formData.set('defaultReportDateRange', '30d');
		await fetch('/settings?/updateSettings', { method: 'POST', body: formData }).catch(() => {});
	}

	// ── Notification modal ───────────────────────────────────────────────────
	let notifOpen = $state(false);
	let localNotifications = $state<typeof data.notifications>([]);
	let localUnreadCount = $state(0);

	// Sync local state when data changes (e.g. on navigation/reload)
	$effect(() => {
		localNotifications = data.notifications ?? [];
		localUnreadCount = data.unreadCount ?? 0;
	});

	async function handleMarkRead(id: string) {
		const formData = new FormData();
		formData.set('notificationId', id);
		await fetch('?/markNotificationRead', { method: 'POST', body: formData });
		localNotifications = localNotifications.map((n) =>
			n.id === id ? { ...n, status: 'read' as const } : n
		);
		localUnreadCount = Math.max(0, localUnreadCount - 1);
	}

	async function handleDismissAll() {
		await fetch('?/dismissAllNotifications', { method: 'POST' });
		localNotifications = localNotifications.map((n) => ({ ...n, status: 'dismissed' as const }));
		localUnreadCount = 0;
	}

	// ── Nav links ────────────────────────────────────────────────────────────
	const navLinks = [
		{ href: '/dashboard', label: 'Dashboard', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
		{ href: '/inventory', label: 'Inventory', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
		{ href: '/stock', label: 'Stock', icon: 'M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4' },
		{ href: '/sales', label: 'Sales', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
		{ href: '/reports', label: 'Reports', icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', ownerOnly: true },
		{ href: '/users', label: 'Users', icon: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z', ownerOnly: true },
		{ href: '/settings', label: 'Settings', icon: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z', ownerOnly: true }
	];

	const visibleLinks = $derived(
		data.user
			? navLinks.filter((l) => !l.ownerOnly || data.user?.role === 'Owner')
			: []
	);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if isAuth}
	<!-- Auth pages — no nav -->
	{@render children()}
{:else}
	<!-- Authenticated app shell -->
	<div class="bg-background flex min-h-screen">
		<!-- Sidebar nav -->
		<aside class="bg-sidebar border-sidebar-border hidden w-56 shrink-0 flex-col border-r lg:flex">
			<!-- Brand -->
			<div class="border-sidebar-border flex h-14 items-center gap-2 border-b px-4">
				<div class="bg-primary flex h-7 w-7 items-center justify-center rounded-lg">
					<svg class="text-primary-foreground h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
						<circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="4" />
					</svg>
				</div>
				<span class="text-sidebar-foreground text-sm font-semibold leading-tight">Jhaerin Tire<br/>Supply</span>
			</div>

			<!-- Nav links -->
			<nav class="flex-1 space-y-0.5 p-3" aria-label="Main navigation">
				{#each visibleLinks as link (link.href)}
					<a
						href={link.href}
						class="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
					>
						<svg class="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
							<path stroke-linecap="round" stroke-linejoin="round" d={link.icon} />
						</svg>
						{link.label}
					</a>
				{/each}
			</nav>

			<!-- User info -->
			{#if data.user}
				<div class="border-sidebar-border border-t p-3">
					<div class="flex items-center gap-2 rounded-lg px-2 py-2">
						<div class="bg-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white">
							{(data.user.name || data.user.email)[0].toUpperCase()}
						</div>
						<div class="min-w-0 flex-1">
							<p class="text-sidebar-foreground truncate text-xs font-medium">{data.user.name || data.user.email}</p>
							<p class="text-sidebar-foreground/60 text-xs">{data.user.role}</p>
						</div>
					</div>
					<form method="POST" action="/logout">
						<button type="submit" class="text-sidebar-foreground/70 hover:text-sidebar-foreground w-full rounded-lg px-2 py-1.5 text-left text-xs transition-colors">
							Sign out
						</button>
					</form>
				</div>
			{/if}
		</aside>

		<!-- Main content area -->
		<div class="flex min-w-0 flex-1 flex-col">
			<!-- Top bar -->
			<header class="bg-card border-border flex h-14 shrink-0 items-center justify-between border-b px-4 lg:px-6">
				<!-- Mobile brand -->
				<span class="text-foreground text-sm font-semibold lg:hidden">Jhaerin Tire Supply</span>
				<div class="hidden lg:block"></div>

				<!-- Right side: theme toggle + notification bell -->
				<div class="flex items-center gap-2">
					<!-- Theme toggle -->
					<button
						type="button"
						onclick={toggleTheme}
						class="text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors"
						aria-label="Toggle {currentTheme === 'dark' ? 'light' : 'dark'} mode"
					>
						{#if currentTheme === 'dark'}
							<!-- Sun icon -->
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
								<circle cx="12" cy="12" r="5" />
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
							</svg>
						{:else}
							<!-- Moon icon -->
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
							</svg>
						{/if}
					</button>

					{#if data.user}
						<button
							type="button"
							onclick={() => (notifOpen = true)}
							class="text-muted-foreground hover:text-foreground relative rounded-md p-1.5 transition-colors"
							aria-label="Notifications{localUnreadCount > 0 ? ` (${localUnreadCount} unread)` : ''}"
						>
							<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
								<path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
							</svg>
							{#if localUnreadCount > 0}
								<span
									class="bg-primary text-primary-foreground absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-bold"
									aria-hidden="true"
								>
									{localUnreadCount > 9 ? '9+' : localUnreadCount}
								</span>
							{/if}
						</button>
					{/if}
				</div>
			</header>

			<!-- Page content -->
			<main class="flex-1 overflow-auto">
				{@render children()}
			</main>
		</div>
	</div>

	<!-- Notification modal -->
	{#if data.user}
		<NotificationModal
			bind:open={notifOpen}
			notifications={localNotifications}
			onclose={() => (notifOpen = false)}
			onMarkRead={handleMarkRead}
			onDismissAll={handleDismissAll}
		/>
	{/if}
{/if}
