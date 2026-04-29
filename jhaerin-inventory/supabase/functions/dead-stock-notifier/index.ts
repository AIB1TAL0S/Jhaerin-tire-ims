/**
 * Dead-Stock Notifier — Supabase Edge Function
 *
 * Deploy this function and schedule it via Supabase Cron (pg_cron) or the
 * Supabase Dashboard scheduler to run daily (e.g. "0 8 * * *").
 *
 * It queries for products with no Stock-Out or Sale movement within the
 * configured dead-stock period and inserts dead-stock notifications for
 * all Owner users.
 *
 * Environment variables required (set in Supabase Dashboard → Edge Functions):
 *   SUPABASE_URL          — your project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (for admin DB access)
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const supabase = createClient(
	Deno.env.get('SUPABASE_URL')!,
	Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
	{ auth: { autoRefreshToken: false, persistSession: false } }
);

Deno.serve(async (_req) => {
	try {
		// Read dead-stock threshold from settings (default 90 days)
		const { data: settingsRows } = await supabase
			.from('settings')
			.select('dead_stock_days')
			.limit(1)
			.single();

		const deadStockDays: number = settingsRows?.dead_stock_days ?? 90;
		const cutoff = new Date();
		cutoff.setDate(cutoff.getDate() - deadStockDays);
		const cutoffISO = cutoff.toISOString();

		// Find product IDs with recent activity
		const { data: activeStockOut } = await supabase
			.from('stock_out')
			.select('product_id')
			.gte('date', cutoffISO);

		const { data: activeSales } = await supabase
			.from('sales')
			.select('product_id')
			.gte('date', cutoffISO);

		const activeIds = new Set([
			...(activeStockOut ?? []).map((r: { product_id: string }) => r.product_id),
			...(activeSales ?? []).map((r: { product_id: string }) => r.product_id)
		]);

		// Fetch all non-archived products
		const { data: allProducts } = await supabase
			.from('products')
			.select('id, brand, size, pattern, quantity')
			.eq('is_archived', false);

		const deadProducts = (allProducts ?? []).filter(
			(p: { id: string }) => !activeIds.has(p.id)
		);

		if (deadProducts.length === 0) {
			return new Response(JSON.stringify({ notified: 0 }), { status: 200 });
		}

		// Fetch all Owner users
		const { data: owners } = await supabase
			.from('users')
			.select('id')
			.eq('role', 'Owner');

		const ownerIds: string[] = (owners ?? []).map((o: { id: string }) => o.id);

		// Insert dead-stock notifications
		const notifications = deadProducts.flatMap(
			(p: { id: string; brand: string; size: string; pattern: string; quantity: number }) =>
				ownerIds.map((userId) => ({
					user_id: userId,
					type: 'dead_stock',
					message: `Dead stock: ${p.brand} ${p.size} ${p.pattern} — no movement in ${deadStockDays}+ days (${p.quantity} units on hand).`,
					status: 'unread'
				}))
		);

		if (notifications.length > 0) {
			await supabase.from('notifications').insert(notifications);
		}

		return new Response(
			JSON.stringify({ notified: deadProducts.length, owners: ownerIds.length }),
			{ status: 200 }
		);
	} catch (err) {
		return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
	}
});
