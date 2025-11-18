import { z } from 'zod';
import { BaseSchema } from './base.schema';

/**
 * Schema for validating annotation input (what users write in Prisma schema)
 * Only validates the fields users can specify in annotations
 */
const IndexSchema = BaseSchema.extend({
	name: z.string().optional(), // Optional, can be auto-generated
	fields: z.array(z.string()).min(1, 'At least one field is required'),
	type: z.enum(['id', 'unique', 'normal']).optional(),
	// Extended properties
	where: z.string().optional(), // For partial indexes
}).strict();

export type Index = z.infer<typeof IndexSchema>;

export const validate = (value: unknown): Index => {
	return IndexSchema.parse(value);
};
