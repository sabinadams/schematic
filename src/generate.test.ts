import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeneratorOptions } from '@prisma/generator-helper';
import { generate } from './generate';
import fs from 'fs/promises';
import { getDMMF, logger } from '@prisma/internals';

vi.mock('fs/promises');
vi.mock('@prisma/internals', async () => {
	const actual = await vi.importActual('@prisma/internals');
	return {
		...actual,
		getDMMF: vi.fn(),
		logger: {
			info: vi.fn(),
			warn: vi.fn(),
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
						{
							hasDefaultValue: false,
							isGenerated: false,
							isId: false,
							isList: false,
							isReadOnly: false,
							isRequired: true,
							isUnique: false,
							isUpdatedAt: false,
							kind: 'scalar' as const,
							name: 'name',
							type: 'String',
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
		config: Record<string, string> = {}
	): GeneratorOptions => ({
		datamodel: '',
		datasources: [],
		dmmf: mockDMMF as any,
		generator: {
			binaryTargets: [],
			config,
			name: 'schematic',
			output: {
				fromEnvVar: null,
				value: './generated',
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

	it('should generate files without a state file', async () => {
		const options = createMockOptions();

		vi.mocked(fs.mkdir).mockResolvedValue(undefined);

		await generate(options);

		expect(logger.info).toHaveBeenCalledWith('New state generation started');
		expect(fs.mkdir).toHaveBeenCalledWith('./generated', { recursive: true });
	});

	it('should create output directory if it does not exist', async () => {
		const options = createMockOptions();

		vi.mocked(fs.mkdir).mockResolvedValue(undefined);

		await generate(options);

		expect(fs.mkdir).toHaveBeenCalledWith('./generated', { recursive: true });
	});

	it('should use custom output directory when specified', async () => {
		const options = createMockOptions();
		options.generator.output = {
			fromEnvVar: null,
			value: './custom-output',
		};

		vi.mocked(fs.mkdir).mockResolvedValue(undefined);

		await generate(options);

		expect(fs.mkdir).toHaveBeenCalledWith('./custom-output', {
			recursive: true,
		});
	});

	it('should attempt to load state file when stateFilePath is provided', async () => {
		const options = createMockOptions({
			stateFilePath: './state.json',
		});

		const mockStateJSON = JSON.stringify({ models: [] });
		vi.mocked(fs.readFile).mockResolvedValue(mockStateJSON);
		vi.mocked(fs.mkdir).mockResolvedValue(undefined);

		await generate(options);

		expect(logger.info).toHaveBeenCalledWith(
			expect.stringContaining('Fetching existing state from')
		);
		expect(logger.info).toHaveBeenCalledWith(
			'State loaded and parsed successfully'
		);
	});

	it('should warn when state file cannot be read', async () => {
		const options = createMockOptions({
			stateFilePath: './missing.json',
		});

		vi.mocked(fs.readFile).mockRejectedValue(
			new Error('ENOENT: no such file or directory')
		);
		vi.mocked(fs.mkdir).mockResolvedValue(undefined);

		await generate(options);

		expect(logger.warn).toHaveBeenCalledWith(
			expect.stringContaining('Could not read or parse state file at')
		);
	});

	it('should compare states when both incoming and previous state exist', async () => {
		const options = createMockOptions({
			stateFilePath: './state.json',
		});

		const mockStateJSON = JSON.stringify({ models: [] });
		vi.mocked(fs.readFile).mockResolvedValue(mockStateJSON);
		vi.mocked(fs.mkdir).mockResolvedValue(undefined);

		await generate(options);

		expect(logger.info).toHaveBeenCalledWith(
			'Comparing previous state to the new state'
		);
	});

	it('should not compare states when no previous state exists', async () => {
		const options = createMockOptions();

		vi.mocked(fs.mkdir).mockResolvedValue(undefined);

		await generate(options);

		expect(logger.info).not.toHaveBeenCalledWith(
			'Comparing previous state to the new state'
		);
	});

	it('should use default output directory when not specified', async () => {
		const options = createMockOptions();
		options.generator.output = null as any;

		vi.mocked(fs.mkdir).mockResolvedValue(undefined);

		await generate(options);

		expect(fs.mkdir).toHaveBeenCalledWith('./generated', {
			recursive: true,
		});
	});
});
