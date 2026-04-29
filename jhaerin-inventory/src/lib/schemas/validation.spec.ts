import { describe, it, expect } from 'vitest';
import { productSchema } from './product';
import { saleSchema } from './sale';
import { stockInSchema } from './stockIn';
import { stockOutSchema } from './stockOut';
import { loginSchema, registerSchema } from './auth';

// ─── 30.6: Zod schema validation — negative prices/quantities rejected ────────

describe('productSchema', () => {
	it('rejects negative quantity', () => {
		const result = productSchema.safeParse({
			brand: 'Bridgestone', size: '205/55R16', pattern: 'Ecopia',
			quantity: -1, costPrice: 100, retailPrice: 150,
			deliveryProvider: 'Direct', lowStockThreshold: 5
		});
		expect(result.success).toBe(false);
	});

	it('rejects zero cost price', () => {
		const result = productSchema.safeParse({
			brand: 'Bridgestone', size: '205/55R16', pattern: 'Ecopia',
			quantity: 10, costPrice: 0, retailPrice: 150,
			deliveryProvider: 'Direct', lowStockThreshold: 5
		});
		expect(result.success).toBe(false);
	});

	it('rejects negative retail price', () => {
		const result = productSchema.safeParse({
			brand: 'Bridgestone', size: '205/55R16', pattern: 'Ecopia',
			quantity: 10, costPrice: 100, retailPrice: -50,
			deliveryProvider: 'Direct', lowStockThreshold: 5
		});
		expect(result.success).toBe(false);
	});

	it('rejects empty brand', () => {
		const result = productSchema.safeParse({
			brand: '', size: '205/55R16', pattern: 'Ecopia',
			quantity: 10, costPrice: 100, retailPrice: 150,
			deliveryProvider: 'Direct', lowStockThreshold: 5
		});
		expect(result.success).toBe(false);
	});

	it('accepts valid product data', () => {
		const result = productSchema.safeParse({
			brand: 'Bridgestone', size: '205/55R16', pattern: 'Ecopia',
			quantity: 10, costPrice: 100, retailPrice: 150,
			deliveryProvider: 'Direct', lowStockThreshold: 5
		});
		expect(result.success).toBe(true);
	});

	it('accepts zero quantity (new product with no stock)', () => {
		const result = productSchema.safeParse({
			brand: 'Bridgestone', size: '205/55R16', pattern: 'Ecopia',
			quantity: 0, costPrice: 100, retailPrice: 150,
			deliveryProvider: 'Direct', lowStockThreshold: 5
		});
		expect(result.success).toBe(true);
	});
});

describe('saleSchema', () => {
	it('rejects zero quantitySold', () => {
		const result = saleSchema.safeParse({
			productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			quantitySold: 0,
			date: new Date()
		});
		expect(result.success).toBe(false);
	});

	it('rejects negative quantitySold', () => {
		const result = saleSchema.safeParse({
			productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			quantitySold: -5,
			date: new Date()
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid UUID', () => {
		const result = saleSchema.safeParse({
			productId: 'not-a-uuid',
			quantitySold: 1,
			date: new Date()
		});
		expect(result.success).toBe(false);
	});

	it('accepts valid sale data', () => {
		const result = saleSchema.safeParse({
			productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			quantitySold: 3,
			date: new Date()
		});
		expect(result.success).toBe(true);
	});
});

describe('stockInSchema', () => {
	it('rejects zero quantity', () => {
		const result = stockInSchema.safeParse({
			productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			quantity: 0,
			deliveryProvider: 'Direct',
			date: new Date()
		});
		expect(result.success).toBe(false);
	});

	it('rejects empty deliveryProvider', () => {
		const result = stockInSchema.safeParse({
			productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			quantity: 5,
			deliveryProvider: '',
			date: new Date()
		});
		expect(result.success).toBe(false);
	});
});

describe('stockOutSchema', () => {
	it('rejects zero quantity', () => {
		const result = stockOutSchema.safeParse({
			productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			quantity: 0,
			reason: 'Damaged',
			date: new Date()
		});
		expect(result.success).toBe(false);
	});

	it('rejects empty reason', () => {
		const result = stockOutSchema.safeParse({
			productId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
			quantity: 2,
			reason: '',
			date: new Date()
		});
		expect(result.success).toBe(false);
	});
});

describe('loginSchema', () => {
	it('rejects invalid email', () => {
		const result = loginSchema.safeParse({ email: 'not-an-email', password: 'pass' });
		expect(result.success).toBe(false);
	});

	it('rejects empty password', () => {
		const result = loginSchema.safeParse({ email: 'user@example.com', password: '' });
		expect(result.success).toBe(false);
	});

	it('accepts valid credentials', () => {
		const result = loginSchema.safeParse({ email: 'user@example.com', password: 'secret' });
		expect(result.success).toBe(true);
	});
});

describe('registerSchema', () => {
	it('rejects password shorter than 8 characters', () => {
		const result = registerSchema.safeParse({
			email: 'user@example.com', password: 'short', role: 'Staff'
		});
		expect(result.success).toBe(false);
	});

	it('rejects invalid role', () => {
		const result = registerSchema.safeParse({
			email: 'user@example.com', password: 'longpassword', role: 'Admin'
		});
		expect(result.success).toBe(false);
	});

	it('accepts valid registration data', () => {
		const result = registerSchema.safeParse({
			email: 'staff@example.com', password: 'securepass', role: 'Staff'
		});
		expect(result.success).toBe(true);
	});
});
