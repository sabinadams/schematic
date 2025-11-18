import { RawParsedAnnotation } from '@/types/schematic.types';

/**
 * Parses @schematic.* annotations into structured objects
 *
 * @param annotation - The annotation string
 * @param annotationPrefix - The prefix to strip (defaults to 'schematic')
 * @returns Parsed annotation object with 'type' and parsed arguments
 *
 * @example
 * parseAnnotation('@schematic.partialIndex(columns: ["email"], where: "active = true")')
 * // Returns: { type: 'partialIndex', columns: ["email"], where: "active = true" }
 */
export function parseAnnotation(
	annotation: string,
	annotationPrefix: string
): RawParsedAnnotation {
	const cleaned = annotation.trim();

	// Strip @prefix. in one step: '@schematic.partialIndex(...)' → 'partialIndex(...)'
	const prefixPattern = new RegExp(`^@${annotationPrefix}\\.`);
	if (!prefixPattern.test(cleaned)) {
		throw new Error(
			`Annotation must start with @${annotationPrefix}. Got: ${annotation}`
		);
	}
	const withoutPrefix = cleaned.replace(prefixPattern, '');

	// Extract type and arguments: 'partialIndex(...)' → ['partialIndex', '...']
	const match = withoutPrefix.match(/^(\w+)\((.*)\)$/s);
	if (!match) {
		throw new Error(
			`Invalid annotation format: ${annotation}. Expected format: @${annotationPrefix}.<type>(<args>)`
		);
	}

	const [, type, argsStr] = match;

	// Parse arguments using JSON-like parsing
	const args = parseArguments(argsStr);

	return {
		_schematic_type: type,
		...args,
	};
}

/**
 * Parses the arguments string into key-value pairs
 * Format: key: value, key2: value2
 */
function parseArguments(argsStr: string): Record<string, unknown> {
	if (!argsStr.trim()) {
		return {};
	}
	const result: Record<string, unknown> = {};
	const pairs = splitArguments(argsStr);

	for (const pair of pairs) {
		const colonIndex = pair.indexOf(':');
		if (colonIndex === -1) continue;

		const key = pair.slice(0, colonIndex).trim();
		const valueStr = pair.slice(colonIndex + 1).trim();

		result[key] = parseValue(valueStr);
	}

	return result;
}

/**
 * Splits arguments by comma, respecting quotes and brackets
 * Simple state machine: track if we're inside quotes or brackets
 */
function splitArguments(str: string): string[] {
	const parts: string[] = [];
	let current = '';
	let quoteChar = ''; // Empty = not in quote, otherwise holds ' or "
	let bracketDepth = 0; // Track [...] and {...}

	for (const char of str) {
		// Toggle quote state
		if ((char === '"' || char === "'") && quoteChar === '') {
			quoteChar = char; // Entering quoted string
		} else if (char === quoteChar) {
			quoteChar = ''; // Exiting quoted string
		}

		// Track brackets (only when not in quotes)
		if (quoteChar === '') {
			if (char === '[' || char === '{') bracketDepth++;
			if (char === ']' || char === '}') bracketDepth--;
		}

		// Split on comma only when outside quotes and brackets
		if (char === ',' && quoteChar === '' && bracketDepth === 0) {
			parts.push(current);
			current = '';
		} else {
			current += char;
		}
	}

	if (current.trim()) {
		parts.push(current);
	}

	return parts;
}

/**
 * Parses a single value (string, number, boolean, array, etc.)
 */
function parseValue(value: string): unknown {
	const trimmed = value.trim();

	// Try JSON.parse first (handles arrays, objects, etc.)
	try {
		return JSON.parse(trimmed);
	} catch {
		// If that fails, return as string (for unquoted values or expressions)
		return trimmed;
	}
}
