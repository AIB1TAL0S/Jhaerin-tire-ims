import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';

export interface JWTClaims {
	userId: string;
	email: string;
	role: 'Owner' | 'Staff';
	exp: number;
	iat: number;
}

export interface JWTPayload {
	sub?: string;
	email?: string;
	exp?: number;
	iat?: number;
	user_metadata?: Record<string, unknown>;
	app_metadata?: Record<string, unknown>;
}

/**
 * Validates a Supabase JWT by calling getUser() with the token.
 * Returns decoded claims on success, null on failure.
 */
export async function validateJWT(token: string): Promise<JWTClaims | null> {
	try {
		const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
		const { data, error } = await supabase.auth.getUser(token);
		if (error || !data.user) return null;

		const user = data.user;
		const role = extractRole({
			sub: user.id,
			email: user.email,
			user_metadata: user.user_metadata,
			app_metadata: user.app_metadata
		});

		return {
			userId: user.id,
			email: user.email ?? '',
			role,
			exp: 0, // Supabase handles expiry validation internally
			iat: 0
		};
	} catch {
		return null;
	}
}

/**
 * Extracts the role from Supabase user metadata.
 * Checks app_metadata first (set by admin), then user_metadata.
 * Defaults to 'Staff' if not found or invalid.
 */
export function extractRole(payload: JWTPayload): 'Owner' | 'Staff' {
	const role =
		(payload.app_metadata?.role as string) ?? (payload.user_metadata?.role as string);
	return role === 'Owner' ? 'Owner' : 'Staff';
}
