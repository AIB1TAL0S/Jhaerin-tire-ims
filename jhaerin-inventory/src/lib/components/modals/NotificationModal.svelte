<script lang="ts">
	import type { Notification } from '$lib/server/db/schema';

	interface Props {
		open: boolean;
		notifications: Notification[];
		onclose: () => void;
		onMarkRead: (id: string) => void;
		onDismissAll: () => void;
	}

	let { open = $bindable(), notifications, onclose, onMarkRead, onDismissAll }: Props = $props();

	const unread = $derived(notifications.filter((n) => n.status === 'unread'));

	function typeIcon(type: Notification['type']) {
		if (type === 'low_stock') return '⚠️';
		if (type === 'dead_stock') return '📦';
		return 'ℹ️';
	}

	function typeLabel(type: Notification['type']) {
		if (type === 'low_stock') return 'Low Stock';
		if (type === 'dead_stock') return 'Dead Stock';
		return 'System';
	}

	function formatDate(d: Date | string) {
		return new Date(d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}
</script>

{#if open}
	<div class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm" role="presentation" onclick={() => { open = false; onclose(); }}></div>

	<div
		class="bg-card border-border fixed top-1/2 left-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-xl border shadow-xl"
		role="dialog" aria-modal="true" aria-labelledby="notif-modal-title"
	>
		<!-- Header -->
		<div class="border-border flex items-center justify-between border-b px-5 py-4">
			<div class="flex items-center gap-2">
				<h2 id="notif-modal-title" class="text-foreground text-lg font-semibold">Notifications</h2>
				{#if unread.length > 0}
					<span class="bg-primary text-primary-foreground rounded-full px-2 py-0.5 text-xs font-medium">{unread.length}</span>
				{/if}
			</div>
			<div class="flex items-center gap-3">
				{#if notifications.length > 0}
					<button type="button" onclick={onDismissAll}
						class="text-muted-foreground hover:text-foreground text-sm transition-colors">
						Dismiss all
					</button>
				{/if}
				<button type="button" onclick={() => { open = false; onclose(); }}
					class="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors" aria-label="Close">
					<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
				</button>
			</div>
		</div>

		<!-- Notification list -->
		<ul class="divide-border max-h-96 divide-y overflow-y-auto">
			{#each notifications as notif (notif.id)}
				<li class={['flex gap-3 px-5 py-4 transition-colors', notif.status === 'unread' ? 'bg-primary/5' : 'hover:bg-muted/40'].join(' ')}>
					<span class="mt-0.5 text-lg" aria-hidden="true">{typeIcon(notif.type)}</span>
					<div class="min-w-0 flex-1">
						<div class="flex items-start justify-between gap-2">
							<span class={['text-xs font-medium', notif.status === 'unread' ? 'text-primary' : 'text-muted-foreground'].join(' ')}>
								{typeLabel(notif.type)}
							</span>
							<span class="text-muted-foreground shrink-0 text-xs">{formatDate(notif.createdAt)}</span>
						</div>
						<p class="text-foreground mt-0.5 text-sm">{notif.message}</p>
						{#if notif.status === 'unread'}
							<button type="button" onclick={() => onMarkRead(notif.id)}
								class="text-primary hover:text-primary/80 mt-1 text-xs font-medium transition-colors">
								Mark as read
							</button>
						{/if}
					</div>
				</li>
			{:else}
				<li class="text-muted-foreground px-5 py-10 text-center text-sm">
					No notifications.
				</li>
			{/each}
		</ul>
	</div>
{/if}
