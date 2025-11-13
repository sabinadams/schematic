import { GeneratorOptions } from '@prisma/generator-helper';
import { logger } from '@prisma/internals';
import fs from 'fs/promises';
import { resolveAndLoadFile, resolveFilePath } from '@/utils/file.utils';
import { SchematicGeneratorOptions } from '@/types/prisma.types';

export async function generate(options: SchematicGeneratorOptions) {
	const { dmmf: incomingState, generator, datasources } = options;
	logger.info('New state generation started');

	// Get the existing state file path if provided
	const stateFilePath = generator.config.stateFilePath;
	const databaseProvider = datasources[0]?.provider;

	if (!databaseProvider) {
		throw new Error('Database provider not found');
	}

	let previousState;
	if (stateFilePath) {
		const resolvedPath = resolveFilePath(options.schemaPath, stateFilePath);
		logger.info(`Loading existing state from: ${resolvedPath}`);

		const state = await resolveAndLoadFile({
			basePath: options.schemaPath,
			filePath: stateFilePath,
			parse: 'json',
		});

		if (!state) {
			throw new Error(`Could not load state file: ${resolvedPath}`);
		}

		logger.info('Previous state loaded successfully');
		previousState = state;
	}

	if (incomingState && previousState) {
		logger.info('Generating new state file');
		// Generate the new state file
		logger.info('Comparing previous state to new state');
		// Compare the previous state to the new state
	}

	// Get the output directory
	const outputDir = generator.output?.value || './generated';

	// Ensure output directory exists
	await fs.mkdir(outputDir, { recursive: true });
}
