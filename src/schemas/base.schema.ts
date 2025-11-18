import z from 'zod';

export const BaseSchema = z.object({
	_schematic_type: z.string(),
	model: z.string(),
});
