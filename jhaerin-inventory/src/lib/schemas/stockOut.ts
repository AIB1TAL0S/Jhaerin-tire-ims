import { z } from 'zod';

export const stockOutSchema = z.object({
	productId: z.string().uuid('Please select a valid product'),
	quantity: z
		.number({ message: 'Quantity must be a number' })
		.int('Quantity must be a whole number')
		.min(1, 'Quantity must be at least 1'),
	reason: z.string().min(1, 'Reason is required'),
	date: z.coerce.date()
});

export type StockOutSchema = typeof stockOutSchema;
