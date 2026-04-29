import { redirect } from '@sveltejs/kit';
import { createServerClient } from '@supabase/ssr';
import { env } from '$env/dynamic/private';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async ({ cookies }) => {
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

		await supabase.auth.signOut();

		// Clear the idle activity cookie
		cookies.delete('last_active', { path: '/' });

		redirect(302, '/login');
	}
};
