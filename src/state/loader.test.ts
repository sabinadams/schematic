import { beforeEach, describe, expect, it, vi } from 'vitest';
import loadState from '@/state/loader';
import * as fileUtils from '@/utils/file.utils';
import { logger } from '@prisma/internals';

vi.mock('@/utils/file.utils');
vi.mock('@prisma/internals', () => ({
	logger: {
		info: vi.fn(),
	},
}));

describe('loadState', () => {
	const mockSchemaPath = '/project/prisma/schema.prisma';
	const mockStateFilePath = './.schematic-state.json';

	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('should throw error when stateFilePath is empty', async () => {
		await expect(loadState('', mockSchemaPath)).rejects.toThrow(
			'State file path is required'
		);
	});

	it('should throw error when schemaPath is empty', async () => {
		await expect(loadState(mockStateFilePath, '')).rejects.toThrow(
			'Schema path is required'
		);
	});

	it('should successfully load state file', async () => {
		const mockState = {
			version: '1.0.0',
			models: ['User', 'Post'],
		};

		vi.mocked(fileUtils.resolveFilePath).mockReturnValue(
			'/project/prisma/.schematic-state.json'
		);
		vi.mocked(fileUtils.resolveAndLoadFile).mockResolvedValue(mockState);

		const result = await loadState(mockStateFilePath, mockSchemaPath);

		expect(result).toEqual(mockState);
		expect(fileUtils.resolveFilePath).toHaveBeenCalledWith(
			mockSchemaPath,
			mockStateFilePath
		);
		expect(fileUtils.resolveAndLoadFile).toHaveBeenCalledWith({
			basePath: mockSchemaPath,
			filePath: mockStateFilePath,
			parse: 'json',
		});
	});

	it('should log loading information', async () => {
		const mockState = { data: 'test' };
		const resolvedPath = '/project/prisma/.schematic-state.json';

		vi.mocked(fileUtils.resolveFilePath).mockReturnValue(resolvedPath);
		vi.mocked(fileUtils.resolveAndLoadFile).mockResolvedValue(mockState);

		await loadState(mockStateFilePath, mockSchemaPath);

		expect(logger.info).toHaveBeenCalledWith(
			`Loading existing state from: ${resolvedPath}`
		);
		expect(logger.info).toHaveBeenCalledWith(
			'Previous state loaded successfully'
		);
	});

	it('should throw error when state file is empty', async () => {
		vi.mocked(fileUtils.resolveFilePath).mockReturnValue(
			'/project/prisma/.schematic-state.json'
		);
		vi.mocked(fileUtils.resolveAndLoadFile).mockResolvedValue(null);

		await expect(
			loadState(mockStateFilePath, mockSchemaPath)
		).rejects.toThrow('State file is empty: ./.schematic-state.json');
	});

	it('should throw error when state file is undefined', async () => {
		vi.mocked(fileUtils.resolveFilePath).mockReturnValue(
			'/project/prisma/.schematic-state.json'
		);
		vi.mocked(fileUtils.resolveAndLoadFile).mockResolvedValue(undefined);

		await expect(
			loadState(mockStateFilePath, mockSchemaPath)
		).rejects.toThrow('State file is empty: ./.schematic-state.json');
	});

	it('should throw descriptive error when file cannot be loaded', async () => {
		const originalError = new Error('File not found');

		vi.mocked(fileUtils.resolveFilePath).mockReturnValue(
			'/project/prisma/.schematic-state.json'
		);
		vi.mocked(fileUtils.resolveAndLoadFile).mockRejectedValue(originalError);

		await expect(
			loadState(mockStateFilePath, mockSchemaPath)
		).rejects.toThrow(
			'There was an error loading the state file: ./.schematic-state.json. File not found'
		);
	});

	it('should handle non-Error exceptions', async () => {
		vi.mocked(fileUtils.resolveFilePath).mockReturnValue(
			'/project/prisma/.schematic-state.json'
		);
		vi.mocked(fileUtils.resolveAndLoadFile).mockRejectedValue(
			'String error message'
		);

		await expect(
			loadState(mockStateFilePath, mockSchemaPath)
		).rejects.toThrow(
			'There was an error loading the state file: ./.schematic-state.json. String error message'
		);
	});

	it('should handle custom state file path', async () => {
		const customPath = './custom/path/state.json';
		const mockState = { custom: true };
		const resolvedPath = '/project/prisma/custom/path/state.json';

		vi.mocked(fileUtils.resolveFilePath).mockReturnValue(resolvedPath);
		vi.mocked(fileUtils.resolveAndLoadFile).mockResolvedValue(mockState);

		const result = await loadState(customPath, mockSchemaPath);

		expect(result).toEqual(mockState);
		expect(fileUtils.resolveFilePath).toHaveBeenCalledWith(
			mockSchemaPath,
			customPath
		);
		expect(fileUtils.resolveAndLoadFile).toHaveBeenCalledWith({
			basePath: mockSchemaPath,
			filePath: customPath,
			parse: 'json',
		});
	});

	it('should handle absolute state file paths', async () => {
		const absolutePath = '/absolute/path/to/state.json';
		const mockState = { absolute: true };

		vi.mocked(fileUtils.resolveFilePath).mockReturnValue(absolutePath);
		vi.mocked(fileUtils.resolveAndLoadFile).mockResolvedValue(mockState);

		const result = await loadState(absolutePath, mockSchemaPath);

		expect(result).toEqual(mockState);
		expect(fileUtils.resolveFilePath).toHaveBeenCalledWith(
			mockSchemaPath,
			absolutePath
		);
	});

	it('should handle different schema paths', async () => {
		const differentSchemaPath = '/different/location/schema.prisma';
		const mockState = { test: 'data' };
		const resolvedPath = '/different/location/.schematic-state.json';

		vi.mocked(fileUtils.resolveFilePath).mockReturnValue(resolvedPath);
		vi.mocked(fileUtils.resolveAndLoadFile).mockResolvedValue(mockState);

		await loadState(mockStateFilePath, differentSchemaPath);

		expect(fileUtils.resolveFilePath).toHaveBeenCalledWith(
			differentSchemaPath,
			mockStateFilePath
		);
		expect(fileUtils.resolveAndLoadFile).toHaveBeenCalledWith({
			basePath: differentSchemaPath,
			filePath: mockStateFilePath,
			parse: 'json',
		});
	});

	it('should handle complex state objects', async () => {
		const complexState = {
			version: '2.0.0',
			models: [
				{ name: 'User', fields: ['id', 'email'] },
				{ name: 'Post', fields: ['id', 'title', 'content'] },
			],
			enums: ['Role', 'Status'],
			metadata: {
				generatedAt: '2023-01-01T00:00:00Z',
				provider: 'postgresql',
			},
		};

		vi.mocked(fileUtils.resolveFilePath).mockReturnValue(
			'/project/prisma/.schematic-state.json'
		);
		vi.mocked(fileUtils.resolveAndLoadFile).mockResolvedValue(complexState);

		const result = await loadState(mockStateFilePath, mockSchemaPath);

		expect(result).toEqual(complexState);
		expect(result).toHaveProperty('version');
		expect(result).toHaveProperty('models');
		expect(result).toHaveProperty('metadata');
	});

	it('should handle state with empty object', async () => {
		const emptyState = {};

		vi.mocked(fileUtils.resolveFilePath).mockReturnValue(
			'/project/prisma/.schematic-state.json'
		);
		vi.mocked(fileUtils.resolveAndLoadFile).mockResolvedValue(emptyState);

		const result = await loadState(mockStateFilePath, mockSchemaPath);

		expect(result).toEqual({});
	});

	it('should preserve error context in error messages', async () => {
		const errorWithContext = new Error('ENOENT: no such file or directory');

		vi.mocked(fileUtils.resolveFilePath).mockReturnValue(
			'/project/prisma/.schematic-state.json'
		);
		vi.mocked(fileUtils.resolveAndLoadFile).mockRejectedValue(
			errorWithContext
		);

		await expect(
			loadState(mockStateFilePath, mockSchemaPath)
		).rejects.toThrow(
			'There was an error loading the state file: ./.schematic-state.json. ENOENT: no such file or directory'
		);
	});

	it('should handle permission errors', async () => {
		const permissionError = new Error('EACCES: permission denied');

		vi.mocked(fileUtils.resolveFilePath).mockReturnValue(
			'/project/prisma/.schematic-state.json'
		);
		vi.mocked(fileUtils.resolveAndLoadFile).mockRejectedValue(permissionError);

		await expect(
			loadState(mockStateFilePath, mockSchemaPath)
		).rejects.toThrow(
			'There was an error loading the state file: ./.schematic-state.json. EACCES: permission denied'
		);
	});

	it('should handle JSON parsing errors from file utils', async () => {
		const jsonError = new Error('Unexpected token in JSON at position 0');

		vi.mocked(fileUtils.resolveFilePath).mockReturnValue(
			'/project/prisma/.schematic-state.json'
		);
		vi.mocked(fileUtils.resolveAndLoadFile).mockRejectedValue(jsonError);

		await expect(
			loadState(mockStateFilePath, mockSchemaPath)
		).rejects.toThrow(
			'There was an error loading the state file: ./.schematic-state.json. Unexpected token in JSON at position 0'
		);
	});
});

