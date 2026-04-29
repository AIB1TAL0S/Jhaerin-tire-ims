import { error, fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 as zod } from 'sveltekit-superforms/adapters';
import { settingsSchema, deliveryProviderSchema } from '$lib/schemas/settings';
import {
	getSettings,
	updateSettings,
	getDeliveryProviders,
	insertDeliveryProvider,
	updateDeliveryProvider,
	deleteDeliveryProvider
} from '$lib/server/models/settings';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (!locals.user || locals.user.role !== 'Owner') {
		error(403, 'Forbidden: Owner access required');
	}

	const [currentSettings, providers, settingsForm, providerForm] = await Promise.all([
		getSettings(),
		getDeliveryProviders(),
		superValidate(zod(settingsSchema)),
		superValidate(zod(deliveryProviderSchema))
	]);

	// Pre-populate settings form with current values
	const populatedSettingsForm = await superValidate(
		{
			globalLowStockThreshold: currentSettings.globalLowStockThreshold,
			deadStockDays: currentSettings.deadStockDays,
			theme: currentSettings.theme as 'light' | 'dark',
			dateFormat: currentSettings.dateFormat,
			defaultReportDateRange: currentSettings.defaultReportDateRange
		},
		zod(settingsSchema)
	);

	return {
		settings: currentSettings,
		providers,
		settingsForm: populatedSettingsForm,
		providerForm
	};
};

export const actions: Actions = {
	updateSettings: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'Owner') error(403, 'Forbidden');

		const form = await superValidate(request, zod(settingsSchema));
		if (!form.valid) return fail(400, { settingsForm: form });

		try {
			await updateSettings({
				globalLowStockThreshold: form.data.globalLowStockThreshold,
				deadStockDays: form.data.deadStockDays,
				theme: form.data.theme,
				dateFormat: form.data.dateFormat,
				defaultReportDateRange: form.data.defaultReportDateRange
			});
		} catch {
			return message(form, { type: 'error', text: 'Failed to save settings.' }, { status: 500 });
		}

		return message(form, { type: 'success', text: 'Settings saved successfully.' });
	},

	createDeliveryProvider: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'Owner') error(403, 'Forbidden');

		const form = await superValidate(request, zod(deliveryProviderSchema));
		if (!form.valid) return fail(400, { providerForm: form });

		try {
			await insertDeliveryProvider(form.data.name);
		} catch (err) {
			const msg = err instanceof Error ? err.message : '';
			if (msg.includes('unique')) {
				return message(form, { type: 'error', text: `A provider named "${form.data.name}" already exists.` }, { status: 422 });
			}
			return message(form, { type: 'error', text: 'Failed to create provider.' }, { status: 500 });
		}

		return message(form, { type: 'success', text: `Provider "${form.data.name}" created.` });
	},

	updateDeliveryProvider: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'Owner') error(403, 'Forbidden');

		const formData = await request.formData();
		const providerId = formData.get('providerId')?.toString();
		if (!providerId) return fail(400, { error: 'Missing providerId' });

		const form = await superValidate(formData, zod(deliveryProviderSchema));
		if (!form.valid) return fail(400, { providerForm: form });

		try {
			await updateDeliveryProvider(providerId, form.data.name);
		} catch (err) {
			const msg = err instanceof Error ? err.message : '';
			if (msg.includes('unique')) {
				return message(form, { type: 'error', text: `A provider named "${form.data.name}" already exists.` }, { status: 422 });
			}
			return message(form, { type: 'error', text: 'Failed to update provider.' }, { status: 500 });
		}

		return message(form, { type: 'success', text: 'Provider updated.' });
	},

	deleteDeliveryProvider: async ({ request, locals }) => {
		if (!locals.user || locals.user.role !== 'Owner') error(403, 'Forbidden');

		const formData = await request.formData();
		const providerId = formData.get('providerId')?.toString();
		if (!providerId) return fail(400, { error: 'Missing providerId' });

		const errorMsg = await deleteDeliveryProvider(providerId);
		if (errorMsg) {
			return fail(422, { error: errorMsg });
		}

		return { success: true };
	}
};
