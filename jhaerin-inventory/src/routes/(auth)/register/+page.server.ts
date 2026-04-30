import { fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 as zod } from 'sveltekit-superforms/adapters';
import { createServerClient } from '@supabase/ssr';
import { env } from '$env/dynamic/private';
import { registerSchema } from '$lib/schemas/auth';
import { insertUser } from '$lib/server/models/users';
import type { PageServerLoad, Actions } from './$types';

// Public registration — always creates Staff accounts.
// Owners are created by the Owner via the /users page.

export const load: PageServerLoad = async ({ locals }) => {
	// Already logged in — go to dashboard
	if (locals.user) {
		return { form: await superValidate(zod(registerSchema)) };
	}

	const form = await superValidate(zod(registerSchema));
	return { form };
};

export const actions: Actions = {
	register: async ({ request, cookies }) => {
		const form = await superValidate(request, zod(registerSchema));
		if (!form.valid) return fail(400, { form });

		// Public registration always creates Staff — role field is ignored
		const role = 'Staff' as const;

		const supabaseAdmin = createServerClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
			cookies: {
				getAll() {
					return cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						cookies.set(name, value, { ...options, path: '/' });
					});
				}
			},
			auth: {
				autoRefreshToken: false,
				persistSession: false
			}
		});

		const { data, error: authError } = await supabaseAdmin.auth.admin.createUser({
			email: form.data.email,
			password: form.data.password,
			user_metadata: { role, name: form.data.name },
			email_confirm: true
		});

		if (authError) {
			if (authError.message.toLowerCase().includes('already registered')) {
				return message(
					form,
					{ type: 'error', text: 'An account with this email address already exists.' },
					{ status: 422 }
				);
			}
			return message(
				form,
				{ type: 'error', text: 'Failed to create account. Please try again.' },
				{ status: 500 }
			);
		}

		try {
			await insertUser({
				id: data.user.id,
				email: data.user.email ?? form.data.email,
				name: form.data.name,
				role
			});
		} catch {
			console.error('Failed to sync new user to local users table:', data.user.id);
		}

		return message(form, {
			type: 'success',
			text: `Account created for ${form.data.name}. You can now sign in.`
		});
	}
};
