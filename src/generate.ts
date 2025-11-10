import { GeneratorOptions } from '@prisma/generator-helper';
import { logger } from '@prisma/internals';
import fs from 'fs/promises';
import { resolveAndLoadFile, resolveFilePath } from './util/fileUtils';

export async function generate(options: GeneratorOptions) {
	const { dmmf: incomingState, generator } = options;
	logger.info('New state generation started');

	// Get the existing state file path if provided
	const stateFilePath = generator.config.stateFilePath as string | undefined;

	let previousState;
	if (stateFilePath) {
		const resolvedPath = resolveFilePath(options.schemaPath, stateFilePath);
		logger.info(`Fetching existing state from ${resolvedPath}`);

		const state = await resolveAndLoadFile({
			basePath: options.schemaPath,
			filePath: stateFilePath,
			parse: 'json',
		});

		if (state) {
			logger.info('State loaded and parsed successfully');
			previousState = state;
		} else {
			logger.warn(`Could not read or parse state file at ${resolvedPath}`);
		}
	}

	if (incomingState && previousState) {
		logger.info('Comparing previous state to new state');
		// Compare the previous state to the new state
	}

	// Get the output directory
	const outputDir = generator.output?.value || './generated';

	// Ensure output directory exists
	await fs.mkdir(outputDir, { recursive: true });
}
