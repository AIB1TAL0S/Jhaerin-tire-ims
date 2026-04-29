import { createServerClient } from '@supabase/ssr';
import { redirect, error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Handle } from '@sveltejs/kit';
import { extractRole } from '$lib/server/auth/jwt';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { sql } from 'drizzle-orm';

// Routes that don't require authentication
const PUBLIC_ROUTES = ['/login', '/register', '/reset-password'];

// Routes restricted to Owner role only
const OWNER_ONLY_PREFIXES = ['/users', '/reports', '/settings', '/financial'];

// Session idle timeout: 30 minutes (in seconds)
const SESSION_IDLE_TIMEOUT_SECONDS = 30 * 60;
const LAST_ACTIVE_COOKIE = 'last_active';

export const handle: Handle = async ({ event, resolve }) => {
	const pathname = event.url.pathname;

	// Initialize Supabase SSR client per request
	const supabase = createServerClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
		cookies: {
			getAll() {
				return event.cookies.getAll();
			},
			setAll(cookiesToSet) {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	// Use getSession() for fast cookie-based auth check on every request.
	// getUser() makes a network round-trip to Supabase Auth on every request
	// which causes Cloudflare Workers CPU timeout. getSession() is safe here
	// because we control the server-side cookies.
	const {
		data: { session }
	} = await supabase.auth.getSession();

	const authUser = session?.user ?? null;

	// ── Session idle expiry ───────────────────────────────────────────────────
	if (authUser) {
		const lastActiveCookie = event.cookies.get(LAST_ACTIVE_COOKIE);
		const now = Math.floor(Date.now() / 1000);

		if (lastActiveCookie) {
			const lastActive = parseInt(lastActiveCookie, 10);
			const idleSeconds = now - lastActive;

			if (idleSeconds > SESSION_IDLE_TIMEOUT_SECONDS) {
				await supabase.auth.signOut();
				event.cookies.delete(LAST_ACTIVE_COOKIE, { path: '/' });
				event.locals.user = null;

				const isPublicRoute = PUBLIC_ROUTES.some((r) => pathname.startsWith(r));
				if (!isPublicRoute) {
					redirect(302, '/login?reason=expired');
				}
			} else {
				event.cookies.set(LAST_ACTIVE_COOKIE, String(now), {
					path: '/',
					httpOnly: true,
					sameSite: 'lax',
					maxAge: SESSION_IDLE_TIMEOUT_SECONDS * 2
				});
			}
		} else {
			event.cookies.set(LAST_ACTIVE_COOKIE, String(now), {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				maxAge: SESSION_IDLE_TIMEOUT_SECONDS * 2
			});
		}
	} else {
		if (event.cookies.get(LAST_ACTIVE_COOKIE)) {
			event.cookies.delete(LAST_ACTIVE_COOKIE, { path: '/' });
		}
	}

	// ── Populate locals ───────────────────────────────────────────────────────
	if (authUser) {
		const role = extractRole({
			user_metadata: authUser.user_metadata,
			app_metadata: authUser.app_metadata
		});

		event.locals.user = {
			userId: authUser.id,
			email: authUser.email ?? '',
			name: (authUser.user_metadata?.name as string) ?? '',
			role
		};
	} else {
		event.locals.user = null;
	}

	// ── First-run detection ───────────────────────────────────────────────────
	// If no users exist in the DB, the app hasn't been set up yet.
	// Redirect /login → /register so the first Owner account can be created.
	if (!event.locals.user && pathname === '/login') {
		try {
			const result = await db
				.select({ count: sql<number>`count(*)::int` })
				.from(users)
				.limit(1);

			const userCount = result[0]?.count ?? 0;
			if (userCount === 0) {
				redirect(302, '/register?setup=true');
			}
		} catch {
			// DB not reachable — let the login page handle it gracefully
		}
	}

	// ── Route guards ──────────────────────────────────────────────────────────
	const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname.startsWith(route));

	// Unauthenticated users can only access public routes
	if (!event.locals.user && !isPublicRoute) {
		redirect(302, '/login');
	}

	// /register is normally Owner-only, EXCEPT during first-run setup
	if (pathname.startsWith('/register') && !event.locals.user) {
		// Allow access only if this is the setup flow (no users exist)
		// The register page server will re-check this condition
	} else if (event.locals.user) {
		// Role guard: Owner-only routes return 403 for Staff
		const isOwnerOnlyRoute = OWNER_ONLY_PREFIXES.some((prefix) => pathname.startsWith(prefix));
		if (isOwnerOnlyRoute && event.locals.user.role !== 'Owner') {
			error(403, 'Forbidden: Owner access required');
		}
	}

	return resolve(event);
};
