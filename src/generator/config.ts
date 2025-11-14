import { SchematicGeneratorOptions } from '@/types/prisma.types';

export default function extractConfigFromSchema(
	config: SchematicGeneratorOptions
) {
	const { generator, datasources } = config;
	const databaseProvider = datasources[0]?.provider;

	if (!databaseProvider) {
		throw new Error('Database provider not found');
	}

	return {
		databaseProvider,
		autoIndexForeignKeys: generator.config.autoIndexForeignKeys ?? false,
		annotationPrefix: generator.config.annotationPrefix ?? 'schematic',
		stateFilePath: generator.config.stateFilePath ?? './.schematic-state.json',
		outputPath: generator.output?.value ?? '../generated',
	};
}
