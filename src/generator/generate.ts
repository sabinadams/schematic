import { GeneratorOptions } from '@prisma/generator-helper';
import { logger } from '@prisma/internals';
import fs from 'fs/promises';
import { resolveAndLoadFile, resolveFilePath } from '@/utils/file.utils';
import { SchematicGeneratorOptions } from '@/types/prisma.types';
import extractConfigFromSchema from './config';
import loadState from '@/state/loader';
import buildState from '@/state/builder';

export async function generate(options: SchematicGeneratorOptions) {
	const { dmmf } = options;

	logger.info('New state generation started');

	const schematicConfig = extractConfigFromSchema(options);
	const { stateFilePath, outputPath } = schematicConfig;

	const previousState = await loadState(stateFilePath, options.schemaPath);

	// Get Incoming State from DMMF
	const incomingState = buildState(dmmf, schematicConfig);

	if (incomingState && previousState) {
		console.log('Incoming state:', incomingState);
		// 	logger.info('Generating new state file');
		// 	// Generate the new fstate file
		// 	logger.info('Comparing previous state to new state');
		// 	// Compare the previous state to the new state
	}

	// Ensure output directory exists
	await fs.mkdir(outputPath, { recursive: true });
}
