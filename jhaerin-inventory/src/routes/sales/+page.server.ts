import { fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 as zod } from 'sveltekit-superforms/adapters';
import { saleSchema } from '$lib/schemas/sale';
import { getSales } from '$lib/server/models/sales';
import { getProducts } from '$lib/server/models/inventory';
import { createSale, updateSaleController, deleteSaleController } from '$lib/server/controllers/sales';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') ?? undefined;
	const productId = url.searchParams.get('productId') ?? undefined;
	const from = url.searchParams.get('from') ? new Date(url.searchParams.get('from')!) : undefined;
	const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to')!) : undefined;
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const limit = 25;
	const offset = (page - 1) * limit;

	const [salesList, productList, form] = await Promise.all([
		getSales({ search, productId, from, to, limit, offset }),
		getProducts({ limit: 200 }),
		superValidate(zod(saleSchema))
	]);

	return {
		sales: salesList,
		products: productList,
		form,
		page,
		search: search ?? '',
		productId: productId ?? '',
		from: url.searchParams.get('from') ?? '',
		to: url.searchParams.get('to') ?? ''
	};
};

export const actions: Actions = {
	createSale: async ({ request }) => {
		const form = await superValidate(request, zod(saleSchema));
		if (!form.valid) return fail(400, { form });

		const result = await createSale({
			productId: form.data.productId,
			quantitySold: form.data.quantitySold,
			date: form.data.date
		});

		if (!result.success) {
			return message(form, { type: 'error', text: result.error }, { status: 422 });
		}

		return message(form, { type: 'success', text: 'Sale recorded successfully.' });
	},

	updateSale: async ({ request }) => {
		const formData = await request.formData();
		const saleId = formData.get('saleId')?.toString();
		if (!saleId) return fail(400, { error: 'Missing saleId' });

		const form = await superValidate(formData, zod(saleSchema));
		if (!form.valid) return fail(400, { form });

		const result = await updateSaleController(saleId, {
			productId: form.data.productId,
			quantitySold: form.data.quantitySold,
			date: form.data.date
		});

		if (!result.success) {
			return message(form, { type: 'error', text: result.error }, { status: 422 });
		}

		return message(form, { type: 'success', text: 'Sale updated successfully.' });
	},

	deleteSale: async ({ request }) => {
		const formData = await request.formData();
		const saleId = formData.get('saleId')?.toString();
		if (!saleId) return fail(400, { error: 'Missing saleId' });

		const result = await deleteSaleController(saleId);

		if (!result.success) {
			return fail(422, { error: result.error });
		}

		return { success: true };
	}
};
