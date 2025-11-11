import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeneratorOptions } from '@prisma/generator-helper';
import { generate } from './generate';
import fs from 'fs/promises';
import { logger } from '@prisma/internals';

vi.mock('fs/promises');
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
		outputPath?: string | null
	): GeneratorOptions => ({
		datamodel: '',
		datasources: [],
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

			await generate(options);

			expect(logger.info).toHaveBeenCalledWith('New state generation started');
			expect(fs.mkdir).toHaveBeenCalledWith('./generated', { recursive: true });
		});

		it('should use custom output directory when specified', async () => {
			const options = createMockOptions({}, './custom-output');
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);

			await generate(options);

			expect(fs.mkdir).toHaveBeenCalledWith('./custom-output', {
				recursive: true,
			});
		});

		it('should use default output directory when null', async () => {
			const options = createMockOptions({}, null);
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);

			await generate(options);

			expect(fs.mkdir).toHaveBeenCalledWith('./generated', {
				recursive: true,
			});
		});
	});

	describe('state file loading', () => {
		it('should not attempt to load state file when not configured', async () => {
			const options = createMockOptions();
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);

			await generate(options);

			expect(fs.readFile).not.toHaveBeenCalled();
			expect(logger.info).not.toHaveBeenCalledWith(
				expect.stringContaining('Loading existing state from')
			);
		});

		it('should load state file when stateFilePath is provided', async () => {
			const options = createMockOptions({
				stateFilePath: './state.json',
			});

			const mockState = { version: '1.0.0', indexes: [] };
			vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockState));
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);

			await generate(options);

			expect(logger.info).toHaveBeenCalledWith(
				expect.stringContaining('Loading existing state from')
			);
			expect(logger.info).toHaveBeenCalledWith(
				'Previous state loaded successfully'
			);
		});

		it('should throw error when state file cannot be loaded', async () => {
			const options = createMockOptions({
				stateFilePath: './missing.json',
			});

			vi.mocked(fs.readFile).mockRejectedValue(
				new Error('ENOENT: no such file or directory')
			);

			await expect(generate(options)).rejects.toThrow(
				'Could not load state file'
			);
		});

		it('should throw error when state file returns null', async () => {
			const options = createMockOptions({
				stateFilePath: './empty.json',
			});

			// Simulate resolveAndLoadFile returning null
			vi.mocked(fs.readFile).mockResolvedValue('');

			await expect(generate(options)).rejects.toThrow(
				'Could not load state file'
			);
		});
	});

	describe('state comparison', () => {
		it('should compare states when both exist', async () => {
			const options = createMockOptions({
				stateFilePath: './state.json',
			});

			const mockState = { version: '1.0.0', indexes: [] };
			vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockState));
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);

			await generate(options);

			expect(logger.info).toHaveBeenCalledWith('Generating new state file');
			expect(logger.info).toHaveBeenCalledWith(
				'Comparing previous state to new state'
			);
		});

		it('should not compare when no previous state exists', async () => {
			const options = createMockOptions();
			vi.mocked(fs.mkdir).mockResolvedValue(undefined);

			await generate(options);

			expect(logger.info).not.toHaveBeenCalledWith('Generating new state file');
			expect(logger.info).not.toHaveBeenCalledWith(
				'Comparing previous state to new state'
			);
		});
	});
});
