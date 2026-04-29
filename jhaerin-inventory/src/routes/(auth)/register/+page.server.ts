import { redirect, fail, error } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 as zod } from 'sveltekit-superforms/adapters';
import { createServerClient } from '@supabase/ssr';
import { env } from '$env/dynamic/private';
import { registerSchema } from '$lib/schemas/auth';
import { insertUser } from '$lib/server/models/users';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';
import type { PageServerLoad, Actions } from './$types';

/** Returns true if no users exist yet (first-run / setup mode). */
async function isSetupMode(): Promise<boolean> {
	try {
		const result = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(users)
			.limit(1);
		return (result[0]?.count ?? 0) === 0;
	} catch {
		return false;
	}
}

export const load: PageServerLoad = async ({ locals, url }) => {
	const setup = await isSetupMode();

	// In setup mode: allow unauthenticated access to create the first Owner
	if (setup) {
		const form = await superValidate(zod(registerSchema));
		return { form, setupMode: true };
	}

	// Normal mode: Owner-only
	if (!locals.user) {
		redirect(302, '/login');
	}
	if (locals.user.role !== 'Owner') {
		error(403, 'Forbidden: Owner access required');
	}

	const form = await superValidate(zod(registerSchema));
	return { form, setupMode: false };
};

export const actions: Actions = {
	register: async ({ request, locals, cookies }) => {
		const setup = await isSetupMode();

		// Enforce access: either setup mode OR authenticated Owner
		if (!setup) {
			if (!locals.user) error(401, 'Unauthorized');
			if (locals.user.role !== 'Owner') error(403, 'Forbidden: Owner access required');
		}

		const form = await superValidate(request, zod(registerSchema));
		if (!form.valid) return fail(400, { form });

		// In setup mode, force the first account to be Owner
		const role = setup ? 'Owner' : form.data.role;

		// Initialize Supabase Admin client
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

		if (setup) {
			// First account created — redirect to login
			redirect(302, '/login?setup=complete');
		}

		return message(form, {
			type: 'success',
			text: `Account created for ${form.data.name} (${form.data.email}) with role ${role}.`
		});
	}
};
