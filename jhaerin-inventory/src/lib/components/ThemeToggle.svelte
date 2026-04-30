<script lang="ts">
	let theme = $state(
		typeof document !== 'undefined'
			? document.documentElement.classList.contains('dark') ? 'dark' : 'light'
			: 'dark'
	);

	function toggle() {
		theme = theme === 'dark' ? 'light' : 'dark';
		if (typeof document !== 'undefined') {
			if (theme === 'dark') {
				document.documentElement.classList.add('dark');
			} else {
				document.documentElement.classList.remove('dark');
			}
		}
		// Persist to localStorage so it survives page reloads
		if (typeof localStorage !== 'undefined') {
			localStorage.setItem('theme', theme);
		}
	}
</script>

<button
	type="button"
	onclick={toggle}
	class="text-muted-foreground hover:text-foreground rounded-md p-1.5 transition-colors"
	aria-label="Toggle {theme === 'dark' ? 'light' : 'dark'} mode"
>
	{#if theme === 'dark'}
		<!-- Sun icon — click to switch to light -->
		<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<circle cx="12" cy="12" r="5" />
			<path stroke-linecap="round" stroke-linejoin="round" d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
		</svg>
	{:else}
		<!-- Moon icon — click to switch to dark -->
		<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
			<path stroke-linecap="round" stroke-linejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
		</svg>
	{/if}
</button>
