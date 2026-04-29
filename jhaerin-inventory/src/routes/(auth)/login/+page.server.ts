import { redirect, fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 as zod } from 'sveltekit-superforms/adapters';
import { createServerClient } from '@supabase/ssr';
import { env } from '$env/dynamic/private';
import { loginSchema } from '$lib/schemas/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, cookies, url }) => {
	// Redirect already-authenticated users away from the login page
	if (locals.user) {
		redirect(302, '/dashboard');
	}

	const reason = url.searchParams.get('reason');
	const setup = url.searchParams.get('setup');

	const form = await superValidate(zod(loginSchema));
	return { form, reason, setup };
};

export const actions: Actions = {
	login: async ({ request, cookies }) => {
		const form = await superValidate(request, zod(loginSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

		// Initialize Supabase SSR client for this action
		const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
			cookies: {
				getAll() {
					return cookies.getAll();
				},
				setAll(cookiesToSet) {
					cookiesToSet.forEach(({ name, value, options }) => {
						cookies.set(name, value, { ...options, path: '/' });
					});
				}
			}
		});

		const { error } = await supabase.auth.signInWithPassword({
			email: form.data.email,
			password: form.data.password
		});

		if (error) {
			// Return a descriptive error without leaking internal details
			return message(
				form,
				{ type: 'error', text: 'Invalid email or password. Please try again.' },
				{ status: 401 }
			);
		}

		redirect(302, '/dashboard');
	}
};
