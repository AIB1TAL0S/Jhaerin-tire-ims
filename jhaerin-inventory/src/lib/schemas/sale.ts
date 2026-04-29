import { z } from 'zod';

export const saleSchema = z.object({
	productId: z.string().uuid('Please select a valid product'),
	quantitySold: z
		.number({ message: 'Quantity must be a number' })
		.int('Quantity must be a whole number')
		.min(1, 'Quantity must be at least 1'),
	date: z.coerce.date()
});

export type SaleSchema = typeof saleSchema;
