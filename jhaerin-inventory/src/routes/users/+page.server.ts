import { error, fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 as zod } from 'sveltekit-superforms/adapters';
import { userFormSchema } from '$lib/schemas/users';
import { getUsers, getActivityLogs } from '$lib/server/models/users';
import {
	createStaffAccount,
	updateStaffAccount,
	deactivateStaffAccount,
	deleteStaffAccount
} from '$lib/server/controllers/auth';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	// Owner-only route — hooks.server.ts enforces this, but double-check here
	if (!locals.user || locals.user.role !== 'Owner') {
		error(403, 'Forbidden: Owner access required');
	}

	const search = url.searchParams.get('search') ?? undefined;
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const limit = 20;
	const offset = (page - 1) * limit;

	// Activity log filters
	const logUserId = url.searchParams.get('logUser') ?? undefined;
	const logFrom = url.searchParams.get('logFrom')
		? new Date(url.searchParams.get('logFrom')!)
		: undefined;
	const logTo = url.searchParams.get('logTo')
		? new Date(url.searchParams.get('logTo')!)
		: undefined;
	const logPage = Math.max(1, Number(url.searchParams.get('logPage') ?? '1'));
	const logLimit = 50;
	const logOffset = (logPage - 1) * logLimit;

	const [userList, activityLogList, createForm] = await Promise.all([
		getUsers({ search, limit, offset }),
		getActivityLogs({ userId: logUserId, from: logFrom, to: logTo, limit: logLimit, offset: logOffset }),
		superValidate(zod(userFormSchema))
	]);

	return {
		users: userList,
		activityLogs: activityLogList,
		createForm,
		page,
		search: search ?? ''
	};
};

export const actions: Actions = {
	createUser: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'Owner') {
			error(403, 'Forbidden');
		}

		const form = await superValidate(request, zod(userFormSchema));
		if (!form.valid) return fail(400, { form });

		// Password is required when creating a new user
		if (!form.data.password) {
			return message(form, { type: 'error', text: 'Password is required when creating a new user.' }, { status: 400 });
		}

		const result = await createStaffAccount(
			form.data.email,
			form.data.password,
			form.data.role,
			locals.user.userId,
			form.data.name ?? ''
		);

		if (!result.success) {
			return message(form, { type: 'error', text: result.error }, { status: 422 });
		}

		return message(form, { type: 'success', text: `Account created for ${form.data.email}.` });
	},

	updateUser: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'Owner') {
			error(403, 'Forbidden');
		}

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		if (!userId) return fail(400, { error: 'Missing userId' });

		const form = await superValidate(formData, zod(userFormSchema));
		if (!form.valid) return fail(400, { form });

		const updates: { email?: string; password?: string; role?: 'Owner' | 'Staff'; name?: string } = {
			email: form.data.email,
			role: form.data.role,
			name: form.data.name ?? ''
		};
		if (form.data.password) updates.password = form.data.password;

		const result = await updateStaffAccount(userId, updates, locals.user.userId);

		if (!result.success) {
			return message(form, { type: 'error', text: result.error }, { status: 422 });
		}

		return message(form, { type: 'success', text: 'Account updated successfully.' });
	},

	deactivateUser: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'Owner') {
			error(403, 'Forbidden');
		}

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		if (!userId) return fail(400, { error: 'Missing userId' });

		const result = await deactivateStaffAccount(userId, locals.user.userId);

		if (!result.success) {
			return fail(422, { error: result.error });
		}

		return { success: true };
	},

	deleteUser: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'Owner') {
			error(403, 'Forbidden');
		}

		const formData = await request.formData();
		const userId = formData.get('userId')?.toString();
		if (!userId) return fail(400, { error: 'Missing userId' });

		const result = await deleteStaffAccount(userId, locals.user.userId);

		if (!result.success) {
			return fail(422, { error: result.error });
		}

		return { success: true };
	}
};
