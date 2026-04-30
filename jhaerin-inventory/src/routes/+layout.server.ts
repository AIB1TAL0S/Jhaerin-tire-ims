import type { LayoutServerLoad } from './$types';
import { getUnreadCount, getNotifications } from '$lib/server/models/notifications';
import { getSettings } from '$lib/server/models/settings';

export const load: LayoutServerLoad = async ({ locals }) => {
	if (!locals.user) {
		// Still load theme for unauthenticated pages
		const settings = await getSettings().catch(() => null);
		return { user: null, unreadCount: 0, notifications: [], theme: settings?.theme ?? 'dark' };
	}

	const [unreadCount, notifications, settings] = await Promise.all([
		getUnreadCount(locals.user.userId).catch(() => 0),
		getNotifications(locals.user.userId, { limit: 20 }).catch(() => []),
		getSettings().catch(() => null)
	]);

	return {
		user: locals.user,
		unreadCount,
		notifications,
		theme: settings?.theme ?? 'dark'
	};
};
