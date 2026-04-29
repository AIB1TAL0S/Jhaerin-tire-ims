import { z } from 'zod';

export const settingsSchema = z.object({
	globalLowStockThreshold: z
		.number({ message: 'Must be a number' })
		.int('Must be a whole number')
		.min(0, 'Cannot be negative'),
	deadStockDays: z
		.number({ message: 'Must be a number' })
		.int('Must be a whole number')
		.min(1, 'Must be at least 1 day'),
	theme: z.enum(['light', 'dark']),
	dateFormat: z.string().min(1, 'Date format is required'),
	defaultReportDateRange: z.string().min(1, 'Default report range is required')
});

export const deliveryProviderSchema = z.object({
	name: z.string().min(1, 'Provider name is required').max(100, 'Name too long')
});

export type SettingsSchema = typeof settingsSchema;
export type DeliveryProviderSchema = typeof deliveryProviderSchema;
