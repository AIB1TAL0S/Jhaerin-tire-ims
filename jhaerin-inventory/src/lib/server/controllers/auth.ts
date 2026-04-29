import { createClient } from '@supabase/supabase-js';
import { env } from '$env/dynamic/private';
import { insertUser, updateUser, logActivity } from '$lib/server/models/users';
import { db } from '$lib/server/db';
import { users } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { User } from '$lib/server/db/schema';
import type { Result } from '$lib/utils/result';

// ─── Supabase Admin client (service role) ────────────────────────────────────
// This client is used exclusively for Admin API operations (user management).
// It is NOT used for session handling — that is done in hooks.server.ts via SSR client.

function getAdminClient() {
	return createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
		auth: {
			autoRefreshToken: false,
			persistSession: false
		}
	});
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface StaffUpdates {
	email?: string;
	password?: string;
	role?: 'Owner' | 'Staff';
	name?: string;
}

// ─── Controller functions ─────────────────────────────────────────────────────

/**
 * Creates a new staff account via Supabase Auth Admin API, mirrors the user
 * into the local `users` table, and logs the activity.
 */
export async function createStaffAccount(
	email: string,
	password: string,
	role: 'Owner' | 'Staff',
	actorUserId: string,
	name: string = ''
): Promise<Result<User>> {
	const admin = getAdminClient();

	const { data, error } = await admin.auth.admin.createUser({
		email,
		password,
		user_metadata: { role, name },
		email_confirm: true
	});

	if (error) {
		if (error.message.toLowerCase().includes('already registered')) {
			return { success: false, error: 'An account with this email address already exists.' };
		}
		return { success: false, error: `Failed to create account: ${error.message}` };
	}

	try {
		const user = await insertUser({
			id: data.user.id,
			email: data.user.email ?? email,
			name,
			role
		});

		await logActivity(actorUserId, `Created staff account: ${name || email} (${role})`);

		return { success: true, data: user };
	} catch (err) {
		// Auth account was created but local sync failed — attempt cleanup
		await admin.auth.admin.deleteUser(data.user.id).catch(() => {});
		return { success: false, error: 'Failed to sync user record. Please try again.' };
	}
}

/**
 * Updates a staff account's email, password, or role via Supabase Auth Admin API
 * and syncs the changes to the local `users` table.
 */
export async function updateStaffAccount(
	userId: string,
	updates: StaffUpdates,
	actorUserId: string
): Promise<Result<User>> {
	const admin = getAdminClient();

	// Build the Supabase Auth update payload
	const authUpdates: Record<string, unknown> = {};
	if (updates.email) authUpdates.email = updates.email;
	if (updates.password) authUpdates.password = updates.password;
	if (updates.role || updates.name) {
		authUpdates.user_metadata = {
			...(updates.role && { role: updates.role }),
			...(updates.name !== undefined && { name: updates.name })
		};
	}

	const { error } = await admin.auth.admin.updateUserById(userId, authUpdates);

	if (error) {
		return { success: false, error: `Failed to update account: ${error.message}` };
	}

	try {
		// Sync to local table — only update fields that were provided
		const localUpdates: Partial<{ email: string; role: 'Owner' | 'Staff'; name: string }> = {};
		if (updates.email) localUpdates.email = updates.email;
		if (updates.role) localUpdates.role = updates.role;
		if (updates.name !== undefined) localUpdates.name = updates.name;

		const user = await updateUser(userId, localUpdates);

		await logActivity(actorUserId, `Updated staff account: ${userId}`);

		return { success: true, data: user };
	} catch (err) {
		return { success: false, error: 'Account updated in Auth but local sync failed.' };
	}
}

/**
 * Deactivates a staff account by banning it via Supabase Auth Admin API.
 * The user can no longer log in but their data is preserved.
 */
export async function deactivateStaffAccount(
	userId: string,
	actorUserId: string
): Promise<Result<void>> {
	const admin = getAdminClient();

	// Setting ban_duration to a far-future date effectively disables the account.
	// Supabase does not have a simple "disable" flag, so we use a long ban.
	const { error } = await admin.auth.admin.updateUserById(userId, {
		ban_duration: '876000h' // 100 years
	});

	if (error) {
		return { success: false, error: `Failed to deactivate account: ${error.message}` };
	}

	await logActivity(actorUserId, `Deactivated staff account: ${userId}`).catch(() => {});

	return { success: true, data: undefined };
}

/**
 * Permanently deletes a staff account from Supabase Auth and removes the
 * corresponding local `users` record.
 */
export async function deleteStaffAccount(
	userId: string,
	actorUserId: string
): Promise<Result<void>> {
	const admin = getAdminClient();

	const { error } = await admin.auth.admin.deleteUser(userId);

	if (error) {
		return { success: false, error: `Failed to delete account: ${error.message}` };
	}

	try {
		await db.delete(users).where(eq(users.id, userId));
		await logActivity(actorUserId, `Deleted staff account: ${userId}`).catch(() => {});
	} catch (err) {
		// Auth user deleted; local record removal failed — log but don't surface as error
		console.error('Failed to remove local user record after Auth deletion:', userId);
	}

	return { success: true, data: undefined };
}
