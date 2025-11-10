import fs from 'fs/promises';
import path from 'path';

export interface ResolveAndLoadFileOptions {
	basePath: string;
	filePath: string;
	parse?: 'json';
}

/**
 * Resolves a file path relative to a base path and loads its contents
 * @param options - The base path, file path, and optional parse format
 * @returns The file contents as a string or parsed object, or undefined if the file cannot be read
 */
export async function resolveAndLoadFile<T = any>(
	options: ResolveAndLoadFileOptions
): Promise<T | string | undefined> {
	const { basePath, filePath, parse } = options;

	try {
		// Resolve the path relative to the base path
		const baseDir = path.dirname(basePath);
		const resolvedPath = path.resolve(baseDir, filePath);

		const contents = await fs.readFile(resolvedPath, 'utf8');

		// Parse if requested
		if (parse === 'json') {
			return JSON.parse(contents) as T;
		}

		return contents;
	} catch {
		return undefined;
	}
}

/**
 * Resolves a file path relative to a base path
 * @param basePath - The base path to resolve from (e.g., schema path)
 * @param filePath - The file path to resolve (can be relative or absolute)
 * @returns The resolved absolute path
 */
export function resolveFilePath(basePath: string, filePath: string): string {
	const baseDir = path.dirname(basePath);
	return path.resolve(baseDir, filePath);
}
