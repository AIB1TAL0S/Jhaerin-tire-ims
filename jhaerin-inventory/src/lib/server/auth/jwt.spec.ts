import { describe, it, expect } from 'vitest';
import { extractRole } from './jwt';

// ─── 30.4: JWT claim extraction and role mapping ──────────────────────────────
describe('extractRole', () => {
	it('extracts Owner role from user_metadata', () => {
		const role = extractRole({
			user_metadata: { role: 'Owner' },
			app_metadata: {}
		});
		expect(role).toBe('Owner');
	});

	it('extracts Staff role from user_metadata', () => {
		const role = extractRole({
			user_metadata: { role: 'Staff' },
			app_metadata: {}
		});
		expect(role).toBe('Staff');
	});

	it('falls back to app_metadata when user_metadata has no role', () => {
		const role = extractRole({
			user_metadata: {},
			app_metadata: { role: 'Owner' }
		});
		expect(role).toBe('Owner');
	});

	it('prefers app_metadata over user_metadata (admin-set takes precedence)', () => {
		const role = extractRole({
			user_metadata: { role: 'Staff' },
			app_metadata: { role: 'Owner' }
		});
		expect(role).toBe('Owner');
	});

	it('defaults to Staff when no role claim is present', () => {
		const role = extractRole({
			user_metadata: {},
			app_metadata: {}
		});
		expect(role).toBe('Staff');
	});

	it('defaults to Staff for unknown role values', () => {
		const role = extractRole({
			user_metadata: { role: 'SuperAdmin' },
			app_metadata: {}
		});
		expect(role).toBe('Staff');
	});
});
