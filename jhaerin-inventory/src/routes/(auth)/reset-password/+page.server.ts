import { redirect, fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 as zod } from 'sveltekit-superforms/adapters';
import { createServerClient } from '@supabase/ssr';
import { env } from '$env/dynamic/private';
import { passwordResetSchema } from '$lib/schemas/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Redirect already-authenticated users away from the reset page
	if (locals.user) {
		redirect(302, '/dashboard');
	}

	const form = await superValidate(zod(passwordResetSchema));
	return { form };
};

export const actions: Actions = {
	requestReset: async ({ request, cookies, url }) => {
		const form = await superValidate(request, zod(passwordResetSchema));

		if (!form.valid) {
			return fail(400, { form });
		}

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

		// Attempt the reset — we intentionally ignore the error to prevent
		// user enumeration (Requirement 1.7): always return the same generic message.
		await supabase.auth.resetPasswordForEmail(form.data.email, {
			redirectTo: `${url.origin}/auth/callback`
		});

		// Always return a generic confirmation regardless of whether the email exists
		return message(form, {
			type: 'success',
			text: 'If an account exists for that email, a password reset link has been sent.'
		});
	}
};
