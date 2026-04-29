import { z } from 'zod';

// Login form schema — used by Superforms on the /login page
export const loginSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	password: z.string().min(1, 'Password is required')
});

// Registration form schema — used by Superforms on the /register page (Owner only)
export const registerSchema = z.object({
	email: z.string().email('Please enter a valid email address'),
	name: z.string().min(1, 'Name is required').max(100, 'Name is too long'),
	password: z.string().min(8, 'Password must be at least 8 characters'),
	role: z.enum(['Owner', 'Staff'])
});

// Password reset request schema — used by Superforms on the /reset-password page
export const passwordResetSchema = z.object({
	email: z.string().email('Please enter a valid email address')
});

// Inferred TypeScript types
export type LoginSchema = typeof loginSchema;
export type RegisterSchema = typeof registerSchema;
export type PasswordResetSchema = typeof passwordResetSchema;
