import { z } from 'zod';

export const stockInSchema = z.object({
	productId: z.string().uuid('Please select a valid product'),
	quantity: z
		.number({ message: 'Quantity must be a number' })
		.int('Quantity must be a whole number')
		.min(1, 'Quantity must be at least 1'),
	deliveryProvider: z.string().min(1, 'Delivery provider is required'),
	salesInvoiceNumber: z
		.string()
		.trim()
		.max(100, 'Sales invoice number must be 100 characters or fewer')
		.optional()
		.default(''),
	date: z.coerce.date({ message: 'Delivery date is required' })
});

export type StockInSchema = typeof stockInSchema;
