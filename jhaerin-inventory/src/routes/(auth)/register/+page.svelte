<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client as zodClient } from 'sveltekit-superforms/adapters';
	import { registerSchema } from '$lib/schemas/auth';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const { form, errors, message, enhance, submitting } = superForm(data.form, {
		validators: zodClient(registerSchema),
		delayMs: 0
	});
</script>

<svelte:head>
	<title>{data.setupMode ? 'Setup — Jhaerin Tire Supply' : 'Create Account — Jhaerin Tire Supply'}</title>
</svelte:head>

<div class="bg-background flex min-h-screen items-center justify-center px-4 py-12">
	<div class="w-full max-w-md space-y-8">
		<!-- Brand -->
		<div class="text-center">
			<div class="bg-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl shadow-lg">
				<svg class="text-primary-foreground h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<circle cx="12" cy="12" r="10" />
					<circle cx="12" cy="12" r="4" />
					<line x1="12" y1="2" x2="12" y2="6" />
					<line x1="12" y1="18" x2="12" y2="22" />
					<line x1="2" y1="12" x2="6" y2="12" />
					<line x1="18" y1="12" x2="22" y2="12" />
				</svg>
			</div>
			<h1 class="text-foreground text-2xl font-bold tracking-tight">
				{data.setupMode ? 'Welcome to JTIMS' : 'Create Account'}
			</h1>
			<p class="text-muted-foreground mt-1 text-sm">
				{data.setupMode
					? 'Create the first Owner account to get started'
					: 'Add a new user to the system'}
			</p>
		</div>

		{#if data.setupMode}
			<div class="bg-primary/10 border-primary/30 rounded-xl border px-4 py-3 text-sm">
				<p class="text-primary font-medium">First-time setup</p>
				<p class="text-muted-foreground mt-0.5 text-xs">
					No accounts exist yet. This account will be created as <strong>Owner</strong> with full system access.
				</p>
			</div>
		{/if}

		<!-- Card -->
		<div class="bg-card border-border rounded-xl border p-8 shadow-sm">
			{#if $message?.type === 'success'}
				<div class="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200" role="status">
					{$message.text}
				</div>
			{/if}
			{#if $message?.type === 'error'}
				<div class="bg-destructive/10 border-destructive/30 text-destructive mb-6 rounded-lg border px-4 py-3 text-sm" role="alert">
					{$message.text}
				</div>
			{/if}

			<form method="POST" action="?/register" use:enhance class="space-y-5">
				<!-- Name -->
				<div class="space-y-1.5">
					<label for="name" class="text-foreground block text-sm font-medium">Full name</label>
					<input
						id="name" name="name" type="text" autocomplete="name"
						bind:value={$form.name}
						aria-invalid={$errors.name ? 'true' : undefined}
						class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-offset-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						placeholder="Juan dela Cruz"
					/>
					{#if $errors.name}
						<p class="text-destructive text-xs" role="alert">{$errors.name}</p>
					{/if}
				</div>

				<!-- Email -->
				<div class="space-y-1.5">
					<label for="email" class="text-foreground block text-sm font-medium">Email address</label>
					<input
						id="email" name="email" type="email" autocomplete="email"
						bind:value={$form.email}
						aria-invalid={$errors.email ? 'true' : undefined}
						class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-offset-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						placeholder="owner@example.com"
					/>
					{#if $errors.email}
						<p class="text-destructive text-xs" role="alert">{$errors.email}</p>
					{/if}
				</div>

				<!-- Password -->
				<div class="space-y-1.5">
					<label for="password" class="text-foreground block text-sm font-medium">Password</label>
					<input
						id="password" name="password" type="password" autocomplete="new-password"
						bind:value={$form.password}
						aria-invalid={$errors.password ? 'true' : undefined}
						class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-offset-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						placeholder="Minimum 8 characters"
					/>
					{#if $errors.password}
						<p class="text-destructive text-xs" role="alert">{$errors.password}</p>
					{/if}
				</div>

				<!-- Role selector — hidden in setup mode (always Owner) -->
				{#if !data.setupMode}
					<div class="space-y-1.5">
						<label for="role" class="text-foreground block text-sm font-medium">Role</label>
						<select
							id="role" name="role"
							bind:value={$form.role}
							aria-invalid={$errors.role ? 'true' : undefined}
							class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-offset-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						>
							<option value="Staff">Staff</option>
							<option value="Owner">Owner</option>
						</select>
						{#if $errors.role}
							<p class="text-destructive text-xs" role="alert">{$errors.role}</p>
						{/if}
					</div>
				{:else}
					<input type="hidden" name="role" value="Owner" />
				{/if}

				<!-- Submit -->
				<button
					type="submit"
					disabled={$submitting}
					class="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring mt-2 flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
				>
					{#if $submitting}
						<svg class="mr-2 h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden="true">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
						</svg>
						{data.setupMode ? 'Creating Owner account…' : 'Creating account…'}
					{:else}
						{data.setupMode ? 'Create Owner account' : 'Create account'}
					{/if}
				</button>
			</form>

			{#if !data.setupMode}
				<p class="text-muted-foreground mt-6 text-center text-xs">
					<a href="/dashboard" class="text-primary hover:text-primary/80 font-medium transition-colors">← Back to dashboard</a>
				</p>
			{/if}

			<p class="text-muted-foreground mt-4 text-center text-sm">
				Already have an account?
				<a href="/login" class="text-primary hover:text-primary/80 font-medium transition-colors">
					Sign in
				</a>
			</p>
		</div>
	</div>
</div>
