import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeneratorOptions } from '@prisma/generator-helper';
import { generate } from './generate';
import fs from 'fs/promises';
import { logger } from '@prisma/internals';
import * as loader from '@/state/loader';

vi.mock('fs/promises');
vi.mock('@/state/loader');
vi.mock('@prisma/internals', async () => {
	const actual = await vi.importActual('@prisma/internals');
	return {
		...actual,
		logger: {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
		},
	};
});

describe('generate', () => {
	const mockDMMF = {
		datamodel: {
			enums: [],
			models: [
				{
					dbName: null,
					fields: [
						{
							hasDefaultValue: true,
							isGenerated: false,
							isId: true,
							isList: false,
							isReadOnly: false,
							isRequired: true,
							isUnique: true,
							isUpdatedAt: false,
							kind: 'scalar' as const,
							name: 'id',
							type: 'Int',
						},
					],
					isGenerated: false,
					name: 'User',
					primaryKey: null,
					schema: null,
					uniqueFields: [],
					uniqueIndexes: [],
				},
			],
			types: [],
		},
		mappings: {
			modelOperations: [],
			otherOperations: { read: [], write: [] },
		},
		schema: {
			enumTypes: { model: null, prisma: [] },
			fieldRefTypes: { prisma: null },
			inputObjectTypes: { model: null, prisma: [] },
			outputObjectTypes: { model: null, prisma: [] },
		},
	};

	const createMockOptions = (
		config: Record<string, string> = {},
		outputPath?: string | null,
		datasources: GeneratorOptions['datasources'] = [
			// @ts-expect-error - Mocking the datasource
			{
				name: 'db',
				provider: 'postgresql',
				url: {
					fromEnvVar: 'DATABASE_URL',
					value: null,
				},
				activeProvider: 'postgresql',
			},
		]
	): GeneratorOptions => ({
		datamodel: '',
		datasources,
		dmmf: mockDMMF as any,
		generator: {
			binaryTargets: [],
			config,
			name: 'schematic',
			output:
				outputPath === null
					? null
					: {
							fromEnvVar: null,
							value: outputPath || './generated',
						},
			previewFeatures: [],
			provider: {
				fromEnvVar: null,
				value: 'node ./dist/generator.js',
			},
			sourceFilePath: '',
		},
		otherGenerators: [],
		schemaPath: './schema.prisma',
		version: '6.0.0',
	});

	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('basic functionality', () => {
		it('should start generation and create output directory', async () => {
			const options = createMockOptions();
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);
			vi.mocked(loader.default).mockResolvedValue({ version: '1.0.0' });

			await generate(options);

			expect(logger.info).toHaveBeenCalledWith('New state generation started');
			expect(fs.mkdir).toHaveBeenCalledWith('./generated', {
				recursive: true,
			});
		});

		it('should use custom output directory when specified', async () => {
			const options = createMockOptions({}, './custom-output');
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);
			vi.mocked(loader.default).mockResolvedValue({ version: '1.0.0' });

			await generate(options);

			expect(fs.mkdir).toHaveBeenCalledWith('./custom-output', {
				recursive: true,
			});
		});

		it('should use default output directory when null', async () => {
			const options = createMockOptions({}, null);
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);
			vi.mocked(loader.default).mockResolvedValue({ version: '1.0.0' });

			await generate(options);

			expect(fs.mkdir).toHaveBeenCalledWith('../generated', {
				recursive: true,
			});
		});
	});

	describe('state file loading', () => {
		it('should load state file with default path when not configured', async () => {
			const options = createMockOptions();
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);
			vi.mocked(loader.default).mockResolvedValue({ version: '1.0.0' });

			await generate(options);

			expect(loader.default).toHaveBeenCalledWith(
				'./.schematic-state.json',
				'./schema.prisma'
			);
		});

		it('should load state file when stateFilePath is provided', async () => {
			const options = createMockOptions({
				stateFilePath: './state.json',
			});

			const mockState = { version: '1.0.0', indexes: [] };
			vi.mocked(loader.default).mockResolvedValue(mockState);
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);

			await generate(options);

			expect(loader.default).toHaveBeenCalledWith(
				'./state.json',
				'./schema.prisma'
			);
		});

		it('should throw error when state file cannot be loaded', async () => {
			const options = createMockOptions({
				stateFilePath: './missing.json',
			});

			vi.mocked(loader.default).mockRejectedValue(
				new Error(
					'There was an error loading the state file: ./missing.json. ENOENT: no such file or directory'
				)
			);

			await expect(generate(options)).rejects.toThrow(
				'There was an error loading the state file'
			);
		});

		it('should throw error when state file returns null', async () => {
			const options = createMockOptions({
				stateFilePath: './empty.json',
			});

			vi.mocked(loader.default).mockRejectedValue(
				new Error('State file is empty: ./empty.json')
			);

			await expect(generate(options)).rejects.toThrow('State file is empty');
		});
	});

	describe('state comparison', () => {
		it('should load state successfully (comparison logic not yet implemented)', async () => {
			const options = createMockOptions({
				stateFilePath: './state.json',
			});

			const mockState = { version: '1.0.0', indexes: [] };
			vi.mocked(loader.default).mockResolvedValue(mockState);
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);

			await generate(options);

			expect(loader.default).toHaveBeenCalledWith(
				'./state.json',
				'./schema.prisma'
			);
			// Note: State comparison logic is commented out in generate.ts
		});

		it('should complete generation even without state comparison', async () => {
			const options = createMockOptions();
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);
			vi.mocked(loader.default).mockResolvedValue({ version: '1.0.0' });

			await generate(options);

			expect(logger.info).toHaveBeenCalledWith('New state generation started');
			// Note: State comparison logic is commented out in generate.ts
		});
	});

	describe('database provider', () => {
		it('should successfully extract database provider', async () => {
			const options = createMockOptions();
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);
			vi.mocked(loader.default).mockResolvedValue({ version: '1.0.0' });

			await generate(options);

			// Should not throw an error
			expect(logger.info).toHaveBeenCalledWith('New state generation started');
		});

		it('should work with mysql provider', async () => {
			const options = createMockOptions({}, undefined, [
				// @ts-expect-error - Mocking the datasource
				{
					name: 'db',
					provider: 'mysql',
					url: {
						fromEnvVar: 'DATABASE_URL',
						value: null,
					},
					activeProvider: 'mysql',
				},
			]);
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);
			vi.mocked(loader.default).mockResolvedValue({ version: '1.0.0' });

			await generate(options);

			expect(logger.info).toHaveBeenCalledWith('New state generation started');
		});

		it('should work with sqlite provider', async () => {
			const options = createMockOptions({}, undefined, [
				// @ts-expect-error - Mocking the datasource
				{
					name: 'db',
					provider: 'sqlite',
					url: {
						fromEnvVar: null,
						value: 'file:./dev.db',
					},
					activeProvider: 'sqlite',
				},
			]);
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);
			vi.mocked(loader.default).mockResolvedValue({ version: '1.0.0' });

			await generate(options);

			expect(logger.info).toHaveBeenCalledWith('New state generation started');
		});

		it('should throw error when datasources array is empty', async () => {
			const options = createMockOptions({}, undefined, []);

			await expect(generate(options)).rejects.toThrow(
				'Database provider not found'
			);
		});

		it('should throw error when provider is undefined', async () => {
			const options = createMockOptions({}, undefined, [
				// @ts-expect-error - Mocking the datasource
				{
					name: 'db',
					provider: undefined as any,
					url: {
						fromEnvVar: 'DATABASE_URL',
						value: null,
					},
					activeProvider: undefined as any,
				},
			]);

			await expect(generate(options)).rejects.toThrow(
				'Database provider not found'
			);
		});
	});
});
