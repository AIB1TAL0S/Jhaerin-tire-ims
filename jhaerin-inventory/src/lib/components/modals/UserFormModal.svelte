<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client as zodClient } from 'sveltekit-superforms/adapters';
	import { userFormSchema } from '$lib/schemas/users';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import type { UserFormSchema } from '$lib/schemas/users';
	import type { User } from '$lib/server/db/schema';

	interface Props {
		open: boolean;
		formData: SuperValidated<Infer<UserFormSchema>>;
		editUser?: User | null;
		onclose: () => void;
	}

	let { open = $bindable(), formData, editUser = null, onclose }: Props = $props();

	const isEdit = $derived(editUser !== null);

	const { form, errors, message, enhance, submitting, reset } = superForm(formData, {
		validators: zodClient(userFormSchema),
		delayMs: 0,
		onResult({ result }) {
			if (result.type === 'success') {
				reset();
				open = false;
				onclose();
			}
		}
	});

	// Populate form when editing an existing user
	$effect(() => {
		if (editUser) {
			$form.name = editUser.name;
			$form.email = editUser.email;
			$form.role = editUser.role;
			$form.password = '';
		} else {
			reset();
		}
	});
</script>

{#if open}
	<!-- Backdrop -->
	<div
		class="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
		role="presentation"
		onclick={() => { open = false; onclose(); }}
	></div>

	<!-- Dialog -->
	<div
		class="bg-card border-border fixed top-1/2 left-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border p-6 shadow-xl"
		role="dialog"
		aria-modal="true"
		aria-labelledby="user-modal-title"
	>
		<!-- Header -->
		<div class="mb-5 flex items-center justify-between">
			<h2 id="user-modal-title" class="text-foreground text-lg font-semibold">
				{isEdit ? 'Edit Account' : 'Create Account'}
			</h2>
			<button
				type="button"
				onclick={() => { open = false; onclose(); }}
				class="text-muted-foreground hover:text-foreground rounded-md p-1 transition-colors"
				aria-label="Close dialog"
			>
				<svg class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
				</svg>
			</button>
		</div>

		<!-- Messages -->
		{#if $message?.type === 'error'}
			<div class="bg-destructive/10 border-destructive/30 text-destructive mb-4 rounded-lg border px-4 py-3 text-sm" role="alert">
				{$message.text}
			</div>
		{/if}

		<form
			method="POST"
			action={isEdit ? '?/updateUser' : '?/createUser'}
			use:enhance
			class="space-y-4"
		>
			{#if isEdit}
				<input type="hidden" name="userId" value={editUser?.id} />
			{/if}

			<!-- Name -->
			<div class="space-y-1.5">
				<label for="modal-name" class="text-foreground block text-sm font-medium">Full name</label>
				<input
					id="modal-name"
					name="name"
					type="text"
					autocomplete="name"
					bind:value={$form.name}
					aria-invalid={$errors.name ? 'true' : undefined}
					class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
					placeholder="Juan dela Cruz"
				/>
				{#if $errors.name}
					<p class="text-destructive text-xs" role="alert">{$errors.name}</p>
				{/if}
			</div>

			<!-- Email -->
			<div class="space-y-1.5">
				<label for="modal-email" class="text-foreground block text-sm font-medium">Email address</label>
				<input
					id="modal-email"
					name="email"
					type="email"
					autocomplete="email"
					bind:value={$form.email}
					aria-invalid={$errors.email ? 'true' : undefined}
					class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
					placeholder="staff@example.com"
				/>
				{#if $errors.email}
					<p class="text-destructive text-xs" role="alert">{$errors.email}</p>
				{/if}
			</div>

			<!-- Password -->
			<div class="space-y-1.5">
				<label for="modal-password" class="text-foreground block text-sm font-medium">
					Password {#if isEdit}<span class="text-muted-foreground font-normal">(leave blank to keep current)</span>{/if}
				</label>
				<input
					id="modal-password"
					name="password"
					type="password"
					autocomplete={isEdit ? 'new-password' : 'new-password'}
					bind:value={$form.password}
					aria-invalid={$errors.password ? 'true' : undefined}
					class="border-input bg-background text-foreground placeholder:text-muted-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
					placeholder={isEdit ? '••••••••' : 'Minimum 8 characters'}
				/>
				{#if $errors.password}
					<p class="text-destructive text-xs" role="alert">{$errors.password}</p>
				{/if}
			</div>

			<!-- Role -->
			<div class="space-y-1.5">
				<label for="modal-role" class="text-foreground block text-sm font-medium">Role</label>
				<select
					id="modal-role"
					name="role"
					bind:value={$form.role}
					aria-invalid={$errors.role ? 'true' : undefined}
					class="border-input bg-background text-foreground focus:ring-ring w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:ring-2 focus:ring-offset-1 focus:outline-none"
				>
					<option value="Staff">Staff</option>
					<option value="Owner">Owner</option>
				</select>
				{#if $errors.role}
					<p class="text-destructive text-xs" role="alert">{$errors.role}</p>
				{/if}
			</div>

			<!-- Actions -->
			<div class="flex justify-end gap-3 pt-2">
				<button
					type="button"
					onclick={() => { open = false; onclose(); }}
					class="border-border text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors"
				>
					Cancel
				</button>
				<button
					type="submit"
					disabled={$submitting}
					class="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-60"
				>
					{#if $submitting}
						Saving…
					{:else}
						{isEdit ? 'Save changes' : 'Create account'}
					{/if}
				</button>
			</div>
		</form>
	</div>
{/if}
