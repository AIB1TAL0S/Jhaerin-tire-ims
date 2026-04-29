import type { LayoutServerLoad } from './$types';
import { getUnreadCount } from '$lib/server/models/notifications';
import { getNotifications } from '$lib/server/models/notifications';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		return { user: null, unreadCount: 0, notifications: [] };
	}

	const [unreadCount, notifications] = await Promise.all([
		getUnreadCount(locals.user.userId),
		getNotifications(locals.user.userId, { limit: 20 })
	]);

	return {
		user: locals.user,
		unreadCount,
		notifications
	};
};
