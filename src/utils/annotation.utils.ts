/**
 * Parses @schematic.* annotations into structured objects
 *
 * @param annotation - The annotation string
 * @returns Parsed annotation object
 *
 * @example
 * parseAnnotation('@schematic.partialIndex(columns: ["email"], where: "active = true")')
 * // Returns: { schematic: 'partial_index', columns: ["email"], where: "active = true" }
 */
export function parseAnnotation(annotation: string): Record<string, unknown> {
	// Remove @ and whitespace
	const cleaned = annotation.trim().replace(/^@/, '');

	// Extract type and arguments: schematic.partialIndex(...)
	const match = cleaned.match(/^schematic\.(\w+)\((.*)\)$/s);
	if (!match) {
		throw new Error(`Invalid annotation format: ${annotation}`);
	}

	const [, type, argsStr] = match;

	// Convert camelCase to snake_case
	const schematicType = type.replace(
		/[A-Z]/g,
		(letter) => `_${letter.toLowerCase()}`
	);

	// Parse arguments using JSON-like parsing
	const args = parseArguments(argsStr);

	return {
		schematic: schematicType,
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
