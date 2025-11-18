import type { SchemaType } from '@/schemas/index';

export interface SchematicConfig {
	databaseProvider: string;
	autoIndexForeignKeys: boolean;
	annotationPrefix: string;
	stateFilePath: string;
	outputPath: string;
}

// Base type for raw parsed annotations (before validation)
export interface RawParsedAnnotation {
	_schematic_type: string;
	[key: string]: unknown;
}

// Validated parsed annotation with known schema type
export interface ParsedAnnotation {
	_schematic_type: SchemaType;
	[key: string]: unknown;
}

export interface Annotation extends ParsedAnnotation {
	model: string;
}
