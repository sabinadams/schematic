import { GeneratorConfig, GeneratorOptions } from '@prisma/generator-helper';

type SchematicConfig = GeneratorConfig['config'] & {
	stateFilePath?: string;
	autoIndexForeignKeys?: boolean;
	annotationPrefix?: string;
};

interface SchematicGeneratorConfig extends GeneratorConfig {
	config: SchematicConfig;
}

export interface SchematicGeneratorOptions extends GeneratorOptions {
	generator: SchematicGeneratorConfig;
}
