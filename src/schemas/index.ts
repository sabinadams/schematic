import { validate as index } from './index.schema';

const schemas = {
	index,
} as const;

export type SchemaType = keyof typeof schemas;

export default schemas;
