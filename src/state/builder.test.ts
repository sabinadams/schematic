import { beforeEach, describe, expect, it, vi } from 'vitest';
import buildState from '@/state/builder';
import { DMMF } from '@prisma/generator-helper';
import * as hashModule from '@/utils/hash';
import * as extractorModule from '@/state/extractor';
import { SchematicConfig } from '@/types/schematic.types';

vi.mock('@/utils/hash');
vi.mock('@/state/extractor');

describe('buildState', () => {
	const mockHash = 'mockedhash123';

	const mockConfig: SchematicConfig = {
		databaseProvider: 'postgresql',
		autoIndexForeignKeys: true,
		annotationPrefix: 'schematic',
		stateFilePath: './schematic.state.json',
		outputPath: './generated',
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.mocked(hashModule.default).mockReturnValue(mockHash);
		vi.mocked(extractorModule.default).mockReturnValue({ indexes: [] });
	});

	const createMockDMMF = (
		overrides: Partial<DMMF.Document> = {}
	): DMMF.Document => ({
		// @ts-expect-error - Mocking DMMF
		datamodel: {
			enums: [],
			models: [],
			types: [],
		},
		schema: {
			inputObjectTypes: {
				// @ts-expect-error - Mocking DMMF
				model: null,
				prisma: [],
			},
			outputObjectTypes: {
				// @ts-expect-error - Mocking DMMF
				model: null,
				prisma: [],
			},
			enumTypes: {
				// @ts-expect-error - Mocking DMMF
				model: null,
				prisma: [],
			},
			fieldRefTypes: {
				// @ts-expect-error - Mocking DMMF
				prisma: null,
			},
		},
		mappings: {
			modelOperations: [],
			otherOperations: {
				read: [],
				write: [],
			},
		},
		...overrides,
	});

	it('should build state with all required fields', () => {
		const mockDMMF = createMockDMMF();
		const result = buildState(mockDMMF, mockConfig);

		expect(result).toHaveProperty('generatedAt');
		expect(result).toHaveProperty('schemaHash');
		expect(result).toHaveProperty('indexes');
	});

	it('should generate schemaHash from DMMF', () => {
		const mockDMMF = createMockDMMF();
		const result = buildState(mockDMMF, mockConfig);

		expect(hashModule.default).toHaveBeenCalledWith(mockDMMF);
		expect(result.schemaHash).toBe(mockHash);
	});

	it('should set generatedAt to ISO string', () => {
		const mockDMMF = createMockDMMF();
		const result = buildState(mockDMMF, mockConfig);

		expect(result.generatedAt).toBeDefined();
		expect(typeof result.generatedAt).toBe('string');
		// Check if it's a valid ISO 8601 date string
		expect(() => new Date(result.generatedAt)).not.toThrow();
		expect(new Date(result.generatedAt).toISOString()).toBe(result.generatedAt);
	});

	it('should initialize indexes as empty array', () => {
		const mockDMMF = createMockDMMF();
		const result = buildState(mockDMMF, mockConfig);

		expect(result.indexes).toEqual([]);
		expect(Array.isArray(result.indexes)).toBe(true);
	});

	it('should initialize indexes as empty array when no indexes exist', () => {
		const mockDMMF = createMockDMMF();
		const result = buildState(mockDMMF, mockConfig);

		expect(result.indexes).toEqual([]);
		expect(Array.isArray(result.indexes)).toBe(true);
	});

	it('should handle DMMF with models', () => {
		const mockDMMF = createMockDMMF({
			datamodel: {
				enums: [],
				models: [
					// @ts-expect-error - Mocking DMMF
					{
						name: 'User',
						dbName: null,
						fields: [
							{
								name: 'id',
								kind: 'scalar',
								isList: false,
								isRequired: true,
								isUnique: true,
								isId: true,
								isReadOnly: false,
								hasDefaultValue: true,
								type: 'Int',
								isGenerated: false,
								isUpdatedAt: false,
							},
						],
						primaryKey: null,
						uniqueFields: [],
						uniqueIndexes: [],
						isGenerated: false,
					},
				],
				types: [],
			},
		});

		const result = buildState(mockDMMF, mockConfig);

		expect(hashModule.default).toHaveBeenCalledWith(mockDMMF);
		expect(result.schemaHash).toBe(mockHash);
	});

	it('should handle DMMF with enums', () => {
		const mockDMMF = createMockDMMF({
			// @ts-expect-error - Mocking DMMF
			datamodel: {
				enums: [
					{
						name: 'Role',
						values: [
							{ name: 'USER', dbName: null },
							{ name: 'ADMIN', dbName: null },
						],
						dbName: null,
					},
				],
				models: [],
				types: [],
			},
		});

		const result = buildState(mockDMMF, mockConfig);

		expect(hashModule.default).toHaveBeenCalledWith(mockDMMF);
		expect(result.schemaHash).toBe(mockHash);
	});

	it('should handle complex DMMF with multiple models', () => {
		const mockDMMF = createMockDMMF({
			datamodel: {
				enums: [],
				models: [
					// @ts-expect-error - Mocking DMMF
					{
						name: 'User',
						dbName: null,
						fields: [],
						primaryKey: null,
						uniqueFields: [],
						uniqueIndexes: [],
						isGenerated: false,
					},
					// @ts-expect-error - Mocking DMMF
					{
						name: 'Post',
						dbName: null,
						fields: [],
						primaryKey: null,
						uniqueFields: [],
						uniqueIndexes: [],
						isGenerated: false,
					},
					// @ts-expect-error - Mocking DMMF
					{
						name: 'Comment',
						dbName: null,
						fields: [],
						primaryKey: null,
						uniqueFields: [],
						uniqueIndexes: [],
						isGenerated: false,
					},
				],
				types: [],
			},
		});

		const result = buildState(mockDMMF, mockConfig);

		expect(hashModule.default).toHaveBeenCalledWith(mockDMMF);
		expect(result).toMatchObject({
			schemaHash: mockHash,
			indexes: [],
		});
	});

	it('should generate different timestamps for consecutive calls', async () => {
		const mockDMMF = createMockDMMF();

		const result1 = buildState(mockDMMF, mockConfig);

		// Wait a tiny bit to ensure different timestamps
		await new Promise((resolve) => setTimeout(resolve, 2));

		const result2 = buildState(mockDMMF, mockConfig);

		// Timestamps should be different (though hash will be the same)
		expect(result1.generatedAt).not.toBe(result2.generatedAt);
		expect(result1.schemaHash).toBe(result2.schemaHash);
	});

	it('should call computeHash with the entire DMMF object', () => {
		const mockDMMF = createMockDMMF({
			datamodel: {
				enums: [{ name: 'TestEnum', values: [], dbName: null }],
				models: [
					// @ts-expect-error - Mocking DMMF
					{
						name: 'TestModel',
						dbName: null,
						fields: [],
						primaryKey: null,
						uniqueFields: [],
						uniqueIndexes: [],
						isGenerated: false,
					},
				],
				types: [],
			},
		});

		buildState(mockDMMF, mockConfig);

		expect(hashModule.default).toHaveBeenCalledTimes(1);
		expect(hashModule.default).toHaveBeenCalledWith(mockDMMF);
	});

	it('should handle empty DMMF', () => {
		const mockDMMF = createMockDMMF();
		const result = buildState(mockDMMF, mockConfig);

		expect(result).toBeDefined();
		expect(result.schemaHash).toBe(mockHash);
		expect(result.indexes).toEqual([]);
	});

	it('should return state with correct structure', () => {
		const mockDMMF = createMockDMMF();
		const result = buildState(mockDMMF, mockConfig);

		expect(Object.keys(result).sort()).toEqual([
			'generatedAt',
			'indexes',
			'schemaHash',
		]);
	});

	it('should handle DMMF with schema information', () => {
		const mockDMMF = createMockDMMF({
			schema: {
				inputObjectTypes: {
					// @ts-expect-error - Mocking DMMF
					model: null,
					prisma: [
						{
							name: 'UserWhereInput',
							constraints: { maxNumFields: null, minNumFields: null },
							fields: [],
						},
					],
				},
				outputObjectTypes: {
					// @ts-expect-error - Mocking DMMF
					model: null,
					prisma: [],
				},
				enumTypes: {
					// @ts-expect-error - Mocking DMMF
					model: null,
					prisma: [],
				},
				fieldRefTypes: {
					// @ts-expect-error - Mocking DMMF
					prisma: null,
				},
			},
		});

		const result = buildState(mockDMMF, mockConfig);

		expect(result.schemaHash).toBe(mockHash);
		expect(hashModule.default).toHaveBeenCalledWith(mockDMMF);
	});

	it('should handle DMMF with mappings', () => {
		const mockDMMF = createMockDMMF({
			mappings: {
				modelOperations: [
					{
						model: 'User',
						plural: 'users',
						findUnique: 'findUniqueUser',
						findUniqueOrThrow: 'findUniqueUserOrThrow',
						findFirst: 'findFirstUser',
						findFirstOrThrow: 'findFirstUserOrThrow',
						findMany: 'findManyUser',
						create: 'createUser',
						createMany: 'createManyUser',
						createManyAndReturn: 'createManyUserAndReturn',
						delete: 'deleteUser',
						update: 'updateUser',
						deleteMany: 'deleteManyUser',
						updateMany: 'updateManyUser',
						upsert: 'upsertUser',
						aggregate: 'aggregateUser',
						groupBy: 'groupByUser',
						count: 'countUser',
						findRaw: 'findUserRaw',
						aggregateRaw: 'aggregateUserRaw',
					},
				],
				otherOperations: {
					read: ['queryRaw'],
					write: ['executeRaw', 'runCommandRaw'],
				},
			},
		});

		const result = buildState(mockDMMF, mockConfig);

		expect(result.schemaHash).toBe(mockHash);
		expect(hashModule.default).toHaveBeenCalledWith(mockDMMF);
	});
});
