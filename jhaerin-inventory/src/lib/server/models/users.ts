import { eq, ilike, or, desc, and, gte, lte } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { users, activityLogs } from '$lib/server/db/schema';
import type { User, NewUser, ActivityLog } from '$lib/server/db/schema';

// ─── Filter types ────────────────────────────────────────────────────────────

export interface UserFilters {
	search?: string; // matches name or email
	limit?: number;
	offset?: number;
}

export interface ActivityLogFilters {
	userId?: string;
	from?: Date;
	to?: Date;
	limit?: number;
	offset?: number;
}

// ─── User queries ─────────────────────────────────────────────────────────────

/**
 * Returns a paginated list of users, optionally filtered by email search.
 */
export async function getUsers(filters: UserFilters = {}): Promise<User[]> {
	const { search, limit = 50, offset = 0 } = filters;

	const whereClause = search
		? or(ilike(users.email, `%${search}%`), ilike(users.name, `%${search}%`))
		: undefined;

	return db
		.select()
		.from(users)
		.where(whereClause)
		.orderBy(desc(users.createdAt))
		.limit(limit)
		.offset(offset);
}

/**
 * Returns a single user by their UUID, or null if not found.
 */
export async function getUserById(id: string): Promise<User | null> {
	const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
	return rows[0] ?? null;
}

/**
 * Inserts a new user record (mirrors a Supabase Auth user into the local table).
 */
export async function insertUser(data: NewUser): Promise<User> {
	const rows = await db.insert(users).values(data).returning();
	return rows[0];
}

/**
 * Updates an existing user record by UUID.
 */
export async function updateUser(id: string, data: Partial<NewUser>): Promise<User> {
	const rows = await db
		.update(users)
		.set({ ...data, updatedAt: new Date() })
		.where(eq(users.id, id))
		.returning();

	if (!rows[0]) throw new Error(`User ${id} not found`);
	return rows[0];
}

// ─── Activity log queries ─────────────────────────────────────────────────────

/**
 * Inserts an activity log entry for audit trail purposes.
 */
export async function logActivity(userId: string, action: string): Promise<void> {
	await db.insert(activityLogs).values({ userId, action });
}

/**
 * Returns a paginated list of activity log entries, optionally filtered by
 * user and date range.
 */
export async function getActivityLogs(filters: ActivityLogFilters = {}): Promise<ActivityLog[]> {
	const { userId, from, to, limit = 50, offset = 0 } = filters;

	const conditions: Parameters<typeof and>[0][] = [];
	if (userId) conditions.push(eq(activityLogs.userId, userId));
	if (from) conditions.push(gte(activityLogs.createdAt, from));
	if (to) conditions.push(lte(activityLogs.createdAt, to));

	return db
		.select()
		.from(activityLogs)
		.where(conditions.length ? and(...conditions) : undefined)
		.orderBy(desc(activityLogs.createdAt))
		.limit(limit)
		.offset(offset);
}
