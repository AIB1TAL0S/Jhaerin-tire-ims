import { z } from 'zod';

export const productSchema = z.object({
	brand: z.string().min(1, 'Brand is required'),
	size: z.string().min(1, 'Size is required'),
	pattern: z.string().min(1, 'Pattern is required'),
	quantity: z
		.number({ message: 'Quantity must be a number' })
		.int('Quantity must be a whole number')
		.min(0, 'Quantity cannot be negative'),
	costPrice: z
		.number({ message: 'Cost price must be a number' })
		.positive('Cost price must be greater than zero'),
	retailPrice: z
		.number({ message: 'Retail price must be a number' })
		.positive('Retail price must be greater than zero'),
	deliveryProvider: z.string().min(1, 'Delivery provider is required'),
	lowStockThreshold: z
		.number({ message: 'Low stock threshold must be a number' })
		.int('Low stock threshold must be a whole number')
		.min(0, 'Low stock threshold cannot be negative')
});

export type ProductSchema = typeof productSchema;
