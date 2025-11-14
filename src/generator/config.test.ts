import { describe, expect, it } from 'vitest';
import extractConfigFromSchema from '@/generator/config';
import { SchematicGeneratorOptions } from '@/types/prisma.types';

describe('extractConfigFromSchema', () => {
	const createMockOptions = (
		overrides: Partial<SchematicGeneratorOptions> = {}
	): SchematicGeneratorOptions => ({
		version: '6.0.0',
		schemaPath: '/project/prisma/schema.prisma',
		dmmf: {
			// @ts-expect-error - Mocking the dmmf
			datamodel: { models: [], enums: [], types: [] },

			// @ts-expect-error - Mocking the schema
			schema: {
				inputObjectTypes: { model: null as any, prisma: [] as any },
				outputObjectTypes: { model: null as any, prisma: [] as any },
				enumTypes: { model: null as any, prisma: [] as any },
			},
			mappings: {
				modelOperations: [],
				otherOperations: { write: [], read: [] },
			},
		},
		datasources: [
			// @ts-expect-error - Mocking the datasource
			{
				name: 'db',
				provider: 'postgresql',
				activeProvider: 'postgresql',
				url: { fromEnvVar: null, value: 'postgresql://localhost:5432/test' },
			},
		],
		// @ts-expect-error - Mocking the generator
		generator: {
			name: 'schematic',
			provider: { value: 'node ./dist/generator.js', fromEnvVar: null },
			output: { value: '../generated', fromEnvVar: null },
			config: {},
			binaryTargets: [],
			previewFeatures: [],
		},
		otherGenerators: [],
		...overrides,
	});

	it('should extract database provider', () => {
		const options = createMockOptions();
		const result = extractConfigFromSchema(options);

		expect(result.databaseProvider).toBe('postgresql');
	});

	it('should throw error when database provider is missing', () => {
		const options = createMockOptions({ datasources: [] });

		expect(() => extractConfigFromSchema(options)).toThrow(
			'Database provider not found'
		);
	});

	it('should use default values for config when not provided', () => {
		const options = createMockOptions();
		const result = extractConfigFromSchema(options);

		expect(result.autoIndexForeignKeys).toBe(false);
		expect(result.annotationPrefix).toBe('schematic');
		expect(result.stateFilePath).toBe('./.schematic-state.json');
		expect(result.outputPath).toBe('../generated');
	});

	it('should extract custom autoIndexForeignKeys value', () => {
		const options = createMockOptions({
			generator: {
				name: 'schematic',
				provider: { value: 'node ./dist/generator.js', fromEnvVar: null },
				output: { value: '../generated', fromEnvVar: null },
				// @ts-expect-error - Mocking the generator config
				config: { autoIndexForeignKeys: 'true' },
				binaryTargets: [],
				previewFeatures: [],
			},
		});

		const result = extractConfigFromSchema(options);
		expect(result.autoIndexForeignKeys).toBe('true');
	});

	it('should extract custom annotationPrefix value', () => {
		const options = createMockOptions({
			// @ts-expect-error - Mocking the generator
			generator: {
				name: 'schematic',
				provider: { value: 'node ./dist/generator.js', fromEnvVar: null },
				output: { value: '../generated', fromEnvVar: null },
				config: { annotationPrefix: 'custom' },
				binaryTargets: [],
				previewFeatures: [],
			},
		});

		const result = extractConfigFromSchema(options);
		expect(result.annotationPrefix).toBe('custom');
	});

	it('should extract custom stateFilePath value', () => {
		const options = createMockOptions({
			// @ts-expect-error - Mocking the generator
			generator: {
				name: 'schematic',
				provider: { value: 'node ./dist/generator.js', fromEnvVar: null },
				output: { value: '../generated', fromEnvVar: null },
				config: { stateFilePath: './custom-state.json' },
				binaryTargets: [],
				previewFeatures: [],
			},
		});

		const result = extractConfigFromSchema(options);
		expect(result.stateFilePath).toBe('./custom-state.json');
	});

	it('should extract custom output path value', () => {
		const options = createMockOptions({
			// @ts-expect-error - Mocking the generator
			generator: {
				name: 'schematic',
				provider: { value: 'node ./dist/generator.js', fromEnvVar: null },
				output: { value: './custom-output', fromEnvVar: null },
				config: {},
				binaryTargets: [],
				previewFeatures: [],
			},
		});

		const result = extractConfigFromSchema(options);
		expect(result.outputPath).toBe('./custom-output');
	});

	it('should handle all custom config values together', () => {
		const options = createMockOptions({
			generator: {
				name: 'schematic',
				provider: { value: 'node ./dist/generator.js', fromEnvVar: null },
				output: { value: './dist/generated', fromEnvVar: null },
				// @ts-expect-error - Mocking the generator config
				config: {
					autoIndexForeignKeys: true,
					annotationPrefix: 'myprefix',
					stateFilePath: './state/schema-state.json',
				},
				binaryTargets: [],
				previewFeatures: [],
			},
		});

		const result = extractConfigFromSchema(options);

		expect(result.databaseProvider).toBe('postgresql');
		expect(result.autoIndexForeignKeys).toBe(true);
		expect(result.annotationPrefix).toBe('myprefix');
		expect(result.stateFilePath).toBe('./state/schema-state.json');
		expect(result.outputPath).toBe('./dist/generated');
	});

	it('should handle different database providers', () => {
		const providers = ['mysql', 'sqlite', 'mongodb', 'cockroachdb'];

		providers.forEach((provider) => {
			const options = createMockOptions({
				datasources: [
					{
						name: 'db',
						// @ts-expect-error - Mocking the datasource
						provider,
						// @ts-expect-error - Mocking the datasource
						activeProvider: provider,
						url: { fromEnvVar: null, value: `${provider}://localhost` },
					},
				],
			});

			const result = extractConfigFromSchema(options);
			expect(result.databaseProvider).toBe(provider);
		});
	});

	it('should use first datasource when multiple are provided', () => {
		const options = createMockOptions({
			datasources: [
				// @ts-expect-error - Mocking the datasource
				{
					name: 'db1',
					provider: 'postgresql',
					activeProvider: 'postgresql',
					url: { fromEnvVar: null, value: 'postgresql://localhost:5432/test' },
				},
				// @ts-expect-error - Mocking the datasource
				{
					name: 'db2',
					provider: 'mysql',
					activeProvider: 'mysql',
					url: { fromEnvVar: null, value: 'mysql://localhost:3306/test' },
				},
			],
		});

		const result = extractConfigFromSchema(options);
		expect(result.databaseProvider).toBe('postgresql');
	});

	it('should handle undefined output value with default', () => {
		const options = createMockOptions({
			// @ts-expect-error - Mocking the generator
			generator: {
				name: 'schematic',
				provider: { value: 'node ./dist/generator.js', fromEnvVar: null },
				output: undefined as any,
				config: {},
				binaryTargets: [],
				previewFeatures: [],
			},
		});

		const result = extractConfigFromSchema(options);
		expect(result.outputPath).toBe('../generated');
	});

	it('should handle null output value with default', () => {
		const options = createMockOptions({
			// @ts-expect-error - Mocking the generator
			generator: {
				name: 'schematic',
				provider: { value: 'node ./dist/generator.js', fromEnvVar: null },
				output: null,
				config: {},
				binaryTargets: [],
				previewFeatures: [],
			},
		});

		const result = extractConfigFromSchema(options);
		expect(result.outputPath).toBe('../generated');
	});

	it('should return all expected keys', () => {
		const options = createMockOptions();
		const result = extractConfigFromSchema(options);

		expect(result).toHaveProperty('databaseProvider');
		expect(result).toHaveProperty('autoIndexForeignKeys');
		expect(result).toHaveProperty('annotationPrefix');
		expect(result).toHaveProperty('stateFilePath');
		expect(result).toHaveProperty('outputPath');
	});
});
