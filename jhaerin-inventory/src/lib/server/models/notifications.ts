import { eq, and, desc, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { notifications } from '$lib/server/db/schema';
import type { Notification, NewNotification } from '$lib/server/db/schema';

// ─── Filter types ─────────────────────────────────────────────────────────────

export interface NotificationFilters {
	status?: 'unread' | 'read' | 'dismissed';
	limit?: number;
	offset?: number;
}

// ─── Notification queries ─────────────────────────────────────────────────────

/**
 * Inserts a new notification record.
 */
export async function insertNotification(data: NewNotification): Promise<Notification> {
	const rows = await db.insert(notifications).values(data).returning();
	return rows[0];
}

/**
 * Returns notifications for a given user, optionally filtered by status.
 */
export async function getNotifications(
	userId: string,
	filters: NotificationFilters = {}
): Promise<Notification[]> {
	const { status, limit = 50, offset = 0 } = filters;

	const conditions = [eq(notifications.userId, userId)];
	if (status) conditions.push(eq(notifications.status, status));

	return db
		.select()
		.from(notifications)
		.where(and(...conditions))
		.orderBy(desc(notifications.createdAt))
		.limit(limit)
		.offset(offset);
}

/**
 * Marks a single notification as read.
 */
export async function markNotificationRead(id: string): Promise<void> {
	await db
		.update(notifications)
		.set({ status: 'read' })
		.where(eq(notifications.id, id));
}

/**
 * Dismisses all notifications for a user in a single batch update.
 */
export async function dismissAllNotifications(userId: string): Promise<void> {
	await db
		.update(notifications)
		.set({ status: 'dismissed' })
		.where(
			and(
				eq(notifications.userId, userId),
				// Only dismiss unread and read — already dismissed ones are left alone
				sql`${notifications.status} != 'dismissed'`
			)
		);
}

/**
 * Returns the count of unread notifications for a user.
 */
export async function getUnreadCount(userId: string): Promise<number> {
	const rows = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(notifications)
		.where(
			and(
				eq(notifications.userId, userId),
				eq(notifications.status, 'unread')
			)
		);

	return rows[0]?.count ?? 0;
}
