<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client as zodClient } from 'sveltekit-superforms/adapters';
	import { passwordResetSchema } from '$lib/schemas/auth';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const { form, errors, message, enhance, submitting } = superForm(data.form, {
		validators: zodClient(passwordResetSchema),
		delayMs: 0
	});
</script>

<svelte:head>
	<title>Reset Password — Jhaerin Tire Supply</title>
</svelte:head>

<div class="bg-background flex min-h-screen items-center justify-center px-4 py-12">
	<div class="w-full max-w-md space-y-8">
		<!-- Brand -->
		<div class="text-center">
			<div
				class="bg-primary mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl shadow-lg"
			>
				<svg
					class="text-primary-foreground h-7 w-7"
					fill="none"
					viewBox="0 0 24 24"
					stroke="currentColor"
					stroke-width="2"
					aria-hidden="true"
				>
					<circle cx="12" cy="12" r="10" />
					<circle cx="12" cy="12" r="4" />
					<line x1="12" y1="2" x2="12" y2="6" />
					<line x1="12" y1="18" x2="12" y2="22" />
					<line x1="2" y1="12" x2="6" y2="12" />
					<line x1="18" y1="12" x2="22" y2="12" />
				</svg>
			</div>
			<h1 class="text-foreground text-2xl font-bold tracking-tight">Reset your password</h1>
			<p class="text-muted-foreground mt-1 text-sm">
				Enter your email and we'll send you a reset link
			</p>
		</div>

		<!-- Card -->
		<div class="bg-card border-border rounded-xl border p-8 shadow-sm">
			<!-- Success state — show confirmation and hide form -->
			{#if $message?.type === 'success'}
				<div
					class="mb-6 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
					role="status"
				>
					{$message.text}
				</div>
				<p class="text-muted-foreground text-center text-sm">
					<a
						href="/login"
						class="text-primary hover:text-primary/80 font-medium transition-colors"
					>
						← Back to sign in
					</a>
				</p>
			{:else}
				<form method="POST" action="?/requestReset" use:enhance class="space-y-5">
					<!-- Email -->
					<div class="space-y-1.5">
						<label for="email" class="text-foreground block text-sm font-medium">
							Email address
						</label>
						<input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							bind:value={$form.email}
							aria-invalid={$errors.email ? 'true' : undefined}
							aria-describedby={$errors.email ? 'email-error' : undefined}
							class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm shadow-sm transition-colors focus:ring-2 focus:ring-offset-1 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
							placeholder="you@example.com"
						/>
						{#if $errors.email}
							<p id="email-error" class="text-destructive text-xs" role="alert">
								{$errors.email}
							</p>
						{/if}
					</div>

					<!-- Submit -->
					<button
						type="submit"
						disabled={$submitting}
						class="bg-primary text-primary-foreground hover:bg-primary/90 focus:ring-ring mt-2 flex w-full items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors focus:ring-2 focus:ring-offset-2 focus:outline-none disabled:cursor-not-allowed disabled:opacity-60"
					>
						{#if $submitting}
							<svg
								class="mr-2 h-4 w-4 animate-spin"
								fill="none"
								viewBox="0 0 24 24"
								aria-hidden="true"
							>
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
								></path>
							</svg>
							Sending…
						{:else}
							Send reset link
						{/if}
					</button>
				</form>

				<p class="text-muted-foreground mt-6 text-center text-sm">
					Remember your password?
					<a
						href="/login"
						class="text-primary hover:text-primary/80 font-medium transition-colors"
					>
						Sign in
					</a>
				</p>
			{/if}
		</div>
	</div>
</div>
