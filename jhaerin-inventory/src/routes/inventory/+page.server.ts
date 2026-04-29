import { fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 as zod } from 'sveltekit-superforms/adapters';
import { productSchema } from '$lib/schemas/product';
import { getProducts } from '$lib/server/models/inventory';
import {
	createProduct,
	updateProductController,
	archiveProductController
} from '$lib/server/controllers/inventory';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const search = url.searchParams.get('search') ?? undefined;
	const deliveryProvider = url.searchParams.get('provider') ?? undefined;
	const lowStockOnly = url.searchParams.get('lowStock') === 'true';
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const limit = 25;
	const offset = (page - 1) * limit;

	const [productList, form] = await Promise.all([
		getProducts({ search, deliveryProvider, lowStockOnly, limit, offset }),
		superValidate(zod(productSchema))
	]);

	return {
		products: productList,
		form,
		page,
		search: search ?? '',
		deliveryProvider: deliveryProvider ?? '',
		lowStockOnly
	};
};

export const actions: Actions = {
	createProduct: async ({ request }) => {
		const form = await superValidate(request, zod(productSchema));
		if (!form.valid) return fail(400, { form });

		const result = await createProduct({
			brand: form.data.brand,
			size: form.data.size,
			pattern: form.data.pattern,
			quantity: form.data.quantity,
			costPrice: String(form.data.costPrice),
			retailPrice: String(form.data.retailPrice),
			deliveryProvider: form.data.deliveryProvider,
			lowStockThreshold: form.data.lowStockThreshold
		});

		if (!result.success) {
			return message(form, { type: 'error', text: result.error }, { status: 422 });
		}

		return message(form, { type: 'success', text: 'Product created successfully.' });
	},

	updateProduct: async ({ request }) => {
		const formData = await request.formData();
		const productId = formData.get('productId')?.toString();
		if (!productId) return fail(400, { error: 'Missing productId' });

		const form = await superValidate(formData, zod(productSchema));
		if (!form.valid) return fail(400, { form });

		const result = await updateProductController(productId, {
			brand: form.data.brand,
			size: form.data.size,
			pattern: form.data.pattern,
			quantity: form.data.quantity,
			costPrice: String(form.data.costPrice),
			retailPrice: String(form.data.retailPrice),
			deliveryProvider: form.data.deliveryProvider,
			lowStockThreshold: form.data.lowStockThreshold
		});

		if (!result.success) {
			return message(form, { type: 'error', text: result.error }, { status: 422 });
		}

		return message(form, { type: 'success', text: 'Product updated successfully.' });
	},

	archiveProduct: async ({ request }) => {
		const formData = await request.formData();
		const productId = formData.get('productId')?.toString();
		if (!productId) return fail(400, { error: 'Missing productId' });

		const result = await archiveProductController(productId);

		if (!result.success) {
			return fail(422, { error: result.error });
		}

		return { success: true };
	}
};
