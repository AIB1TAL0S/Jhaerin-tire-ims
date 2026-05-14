import { fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 as zod } from 'sveltekit-superforms/adapters';
import { stockInSchema } from '$lib/schemas/stockIn';
import { stockOutSchema } from '$lib/schemas/stockOut';
import { getStockIn, getStockOut, insertStockIn, updateStockIn, deleteStockIn, adjustProductQuantity } from '$lib/server/models/stock';
import { insertStockOut, updateStockOut, deleteStockOut } from '$lib/server/models/stock';
import { getProducts } from '$lib/server/models/inventory';
import { getDeliveryProviders } from '$lib/server/models/settings';
import { createSale } from '$lib/server/controllers/sales';
import { db } from '$lib/server/db';
import type { PageServerLoad, Actions } from './$types';

export const load: PageServerLoad = async ({ url }) => {
	const tab = url.searchParams.get('tab') ?? 'in';
	const from = url.searchParams.get('from') ? new Date(url.searchParams.get('from')!) : undefined;
	const to = url.searchParams.get('to') ? new Date(url.searchParams.get('to')!) : undefined;
	const page = Math.max(1, Number(url.searchParams.get('page') ?? '1'));
	const limit = 25;
	const offset = (page - 1) * limit;

	const [stockInList, stockOutList, productList, providers, stockInForm, stockOutForm] = await Promise.all([
		getStockIn({ from, to, limit, offset }),
		getStockOut({ from, to, limit, offset }),
		getProducts({ limit: 200 }),
		getDeliveryProviders(),
		superValidate(zod(stockInSchema)),
		superValidate(zod(stockOutSchema))
	]);

	return {
		stockIn: stockInList,
		stockOut: stockOutList,
		products: productList,
		providers,
		stockInForm,
		stockOutForm,
		tab,
		page
	};
};

export const actions: Actions = {
	// ── Stock-In ──────────────────────────────────────────────────────────────
	createStockIn: async ({ request }) => {
		const form = await superValidate(request, zod(stockInSchema));
		if (!form.valid) return fail(400, { stockInForm: form });

		try {
			await db.transaction(async (tx) => {
				await insertStockIn(tx, {
					productId: form.data.productId,
					quantity: form.data.quantity,
					deliveryProvider: form.data.deliveryProvider,
					salesInvoiceNumber: form.data.salesInvoiceNumber.trim() || null,
					date: form.data.date
				});
				await adjustProductQuantity(tx, form.data.productId, form.data.quantity);
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Transaction failed.';
			return message(form, { type: 'error', text: msg }, { status: 422 });
		}

		return message(form, { type: 'success', text: 'Stock-In recorded successfully.' });
	},

	updateStockIn: async ({ request }) => {
		const formData = await request.formData();
		const recordId = formData.get('recordId')?.toString();
		if (!recordId) return fail(400, { error: 'Missing recordId' });

		const form = await superValidate(formData, zod(stockInSchema));
		if (!form.valid) return fail(400, { stockInForm: form });

		try {
			await db.transaction(async (tx) => {
				// Fetch old record to compute delta
				const existing = await tx.query.stockIn.findFirst({
					where: (t, { eq }) => eq(t.id, recordId)
				});
				if (!existing) throw new Error('Stock-In record not found.');

				const delta = form.data.quantity - existing.quantity;
				await updateStockIn(tx, recordId, {
					productId: form.data.productId,
					quantity: form.data.quantity,
					deliveryProvider: form.data.deliveryProvider,
					salesInvoiceNumber: form.data.salesInvoiceNumber.trim() || null,
					date: form.data.date
				});
				if (delta !== 0) {
					await adjustProductQuantity(tx, form.data.productId, delta);
				}
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Transaction failed.';
			return message(form, { type: 'error', text: msg }, { status: 422 });
		}

		return message(form, { type: 'success', text: 'Stock-In updated successfully.' });
	},

	deleteStockIn: async ({ request }) => {
		const formData = await request.formData();
		const recordId = formData.get('recordId')?.toString();
		if (!recordId) return fail(400, { error: 'Missing recordId' });

		try {
			await db.transaction(async (tx) => {
				// Fetch record to reverse quantity
				const existing = await tx.query.stockIn.findFirst({
					where: (t, { eq }) => eq(t.id, recordId)
				});
				if (!existing) throw new Error('Stock-In record not found.');

				await adjustProductQuantity(tx, existing.productId, -existing.quantity);
				await deleteStockIn(tx, recordId);
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Transaction failed.';
			return fail(422, { error: msg });
		}

		return { success: true };
	},

	// ── Stock-Out ─────────────────────────────────────────────────────────────
	createStockOut: async ({ request }) => {
		const form = await superValidate(request, zod(stockOutSchema));
		if (!form.valid) return fail(400, { stockOutForm: form });

		if (form.data.reason.trim().toLowerCase() === 'sales') {
			const result = await createSale({
				productId: form.data.productId,
				quantitySold: form.data.quantity,
				date: form.data.date
			});

			if (!result.success) {
				return message(form, { type: 'error', text: result.error }, { status: 422 });
			}

			return message(form, { type: 'success', text: 'Sale recorded successfully.' });
		}

		try {
			await db.transaction(async (tx) => {
				// insertStockOut validates quantity against current stock internally
				await insertStockOut(tx, {
					productId: form.data.productId,
					quantity: form.data.quantity,
					reason: form.data.reason,
					date: form.data.date
				});
				await adjustProductQuantity(tx, form.data.productId, -form.data.quantity);
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Transaction failed.';
			return message(form, { type: 'error', text: msg }, { status: 422 });
		}

		return message(form, { type: 'success', text: 'Stock-Out recorded successfully.' });
	},

	updateStockOut: async ({ request }) => {
		const formData = await request.formData();
		const recordId = formData.get('recordId')?.toString();
		if (!recordId) return fail(400, { error: 'Missing recordId' });

		const form = await superValidate(formData, zod(stockOutSchema));
		if (!form.valid) return fail(400, { stockOutForm: form });

		try {
			await db.transaction(async (tx) => {
				// updateStockOut handles delta reversal and validation internally
				await updateStockOut(tx, recordId, {
					productId: form.data.productId,
					quantity: form.data.quantity,
					reason: form.data.reason,
					date: form.data.date
				});
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Transaction failed.';
			return message(form, { type: 'error', text: msg }, { status: 422 });
		}

		return message(form, { type: 'success', text: 'Stock-Out updated successfully.' });
	},

	deleteStockOut: async ({ request }) => {
		const formData = await request.formData();
		const recordId = formData.get('recordId')?.toString();
		if (!recordId) return fail(400, { error: 'Missing recordId' });

		try {
			await db.transaction(async (tx) => {
				// deleteStockOut restores quantity internally
				await deleteStockOut(tx, recordId);
			});
		} catch (err) {
			const msg = err instanceof Error ? err.message : 'Transaction failed.';
			return fail(422, { error: msg });
		}

		return { success: true };
	}
};
