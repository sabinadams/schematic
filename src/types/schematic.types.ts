export interface SchematicConfig {
	databaseProvider: string;
	autoIndexForeignKeys: boolean;
	annotationPrefix: string;
	stateFilePath: string;
	outputPath: string;
}

export interface ParsedAnnotation {
	_schematic_type: string;
	[key: string]: unknown;
}

export interface Annotation extends ParsedAnnotation {
	model: string;
}
