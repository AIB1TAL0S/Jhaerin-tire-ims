import { z } from 'zod';

export const userFormSchema = z.object({
	name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
	email: z.string().email('Please enter a valid email address'),
	role: z.enum(['Owner', 'Staff']),
	password: z
		.string()
		.min(8, 'Password must be at least 8 characters')
		.optional()
		.or(z.literal(''))
});

export type UserFormSchema = typeof userFormSchema;
