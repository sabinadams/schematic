import { resolveAndLoadFile, resolveFilePath } from '@/utils/file.utils';
import { logger } from '@prisma/internals';

/**
 * Loads the previous state from the state file
 * @param stateFilePath - The path to the state file
 * @param schemaPath - The path to the schema file, acts as the base path for the state file
 * @returns The previous state
 * @throws An error if the state file cannot be loaded
 */
export default async function loadState(
	stateFilePath: string,
	schemaPath: string
) {
	if (!stateFilePath) {
		throw new Error('State file path is required');
	}

	if (!schemaPath) {
		throw new Error('Schema path is required');
	}

	try {
		const resolvedPath = resolveFilePath(schemaPath, stateFilePath);
		logger.info(`Loading existing state from: ${resolvedPath}`);

		const state = await resolveAndLoadFile({
			basePath: schemaPath,
			filePath: stateFilePath,
			parse: 'json',
		});

		if (!state) {
			throw new Error(`State file is empty: ${stateFilePath}`);
		}

		logger.info('Previous state loaded successfully');

		return state;
	} catch (error: unknown) {
		if (error instanceof Error) {
			throw new Error(
				`There was an error loading the state file: ${stateFilePath}. ${error.message}`
			);
		}
		throw new Error(
			`There was an error loading the state file: ${stateFilePath}. ${error}`
		);
	}
}
