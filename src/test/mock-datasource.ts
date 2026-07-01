import type { GeneratorOptions } from '@prisma/generator-helper';

type ActiveProvider = GeneratorOptions['datasources'][number]['activeProvider'];

export function createMockDataSource(
	provider: ActiveProvider,
	name = 'db'
): GeneratorOptions['datasources'][number] {
	return {
		name,
		provider,
		activeProvider: provider,
		schemas: [],
		sourceFilePath: '/project/prisma/schema.prisma',
	};
}
