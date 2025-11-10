import { beforeEach, describe, expect, it, vi } from 'vitest';
import fs from 'fs/promises';
import path from 'path';
import { resolveAndLoadFile, resolveFilePath } from './fileUtils';

vi.mock('fs/promises');

describe('fileUtils', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	describe('resolveAndLoadFile', () => {
		it('should load a plain text file successfully', async () => {
			const mockContent = 'Hello, World!';
			vi.mocked(fs.readFile).mockResolvedValue(mockContent);

			const result = await resolveAndLoadFile({
				basePath: '/project/schema.prisma',
				filePath: './readme.txt',
			});

			expect(result).toBe(mockContent);
			expect(fs.readFile).toHaveBeenCalledWith(
				path.resolve('/project', './readme.txt'),
				'utf8'
			);
		});

		it('should load and parse a JSON file successfully', async () => {
			const mockData = { foo: 'bar', models: ['User', 'Post'] };
			const mockContent = JSON.stringify(mockData);
			vi.mocked(fs.readFile).mockResolvedValue(mockContent);

			const result = await resolveAndLoadFile({
				basePath: '/project/schema.prisma',
				filePath: './state.json',
				parse: 'json',
			});

			expect(result).toEqual(mockData);
		});

		it('should return undefined when file does not exist', async () => {
			vi.mocked(fs.readFile).mockRejectedValue(
				new Error('ENOENT: no such file or directory')
			);

			const result = await resolveAndLoadFile({
				basePath: '/project/schema.prisma',
				filePath: './missing.txt',
			});

			expect(result).toBeUndefined();
		});

		it('should return undefined when JSON parsing fails', async () => {
			const invalidJSON = '{ invalid json }';
			vi.mocked(fs.readFile).mockResolvedValue(invalidJSON);

			const result = await resolveAndLoadFile({
				basePath: '/project/schema.prisma',
				filePath: './invalid.json',
				parse: 'json',
			});

			expect(result).toBeUndefined();
		});

		it('should resolve relative paths correctly', async () => {
			const mockContent = 'test content';
			vi.mocked(fs.readFile).mockResolvedValue(mockContent);

			await resolveAndLoadFile({
				basePath: '/project/prisma/schema.prisma',
				filePath: '../config.json',
			});

			expect(fs.readFile).toHaveBeenCalledWith(
				path.resolve('/project/prisma', '../config.json'),
				'utf8'
			);
		});

		it('should handle absolute file paths', async () => {
			const mockContent = 'test content';
			vi.mocked(fs.readFile).mockResolvedValue(mockContent);

			await resolveAndLoadFile({
				basePath: '/project/schema.prisma',
				filePath: '/absolute/path/file.txt',
			});

			expect(fs.readFile).toHaveBeenCalledWith(
				path.resolve('/project', '/absolute/path/file.txt'),
				'utf8'
			);
		});

		it('should work with nested directory structures', async () => {
			const mockContent = 'nested content';
			vi.mocked(fs.readFile).mockResolvedValue(mockContent);

			await resolveAndLoadFile({
				basePath: '/project/src/modules/schema.prisma',
				filePath: './data/state.json',
			});

			expect(fs.readFile).toHaveBeenCalledWith(
				path.resolve('/project/src/modules', './data/state.json'),
				'utf8'
			);
		});

		it('should preserve type information for JSON parsing', async () => {
			interface TestType {
				count: number;
				name: string;
			}

			const mockData: TestType = { count: 42, name: 'test' };
			vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(mockData));

			const result = await resolveAndLoadFile<TestType>({
				basePath: '/project/schema.prisma',
				filePath: './data.json',
				parse: 'json',
			});

			expect(result).toEqual(mockData);
			if (result && typeof result !== 'string') {
				expect(result.count).toBe(42);
				expect(result.name).toBe('test');
			}
		});

		it('should handle empty files', async () => {
			vi.mocked(fs.readFile).mockResolvedValue('');

			const result = await resolveAndLoadFile({
				basePath: '/project/schema.prisma',
				filePath: './empty.txt',
			});

			expect(result).toBe('');
		});

		it('should handle empty JSON object', async () => {
			vi.mocked(fs.readFile).mockResolvedValue('{}');

			const result = await resolveAndLoadFile({
				basePath: '/project/schema.prisma',
				filePath: './empty.json',
				parse: 'json',
			});

			expect(result).toEqual({});
		});

		it('should handle complex JSON structures', async () => {
			const complexData = {
				deeply: {
					nested: {
						array: [1, 2, 3],
						object: {
							bool: true,
							null: null,
						},
					},
				},
			};
			vi.mocked(fs.readFile).mockResolvedValue(JSON.stringify(complexData));

			const result = await resolveAndLoadFile({
				basePath: '/project/schema.prisma',
				filePath: './complex.json',
				parse: 'json',
			});

			expect(result).toEqual(complexData);
		});
	});

	describe('resolveFilePath', () => {
		it('should resolve relative paths correctly', () => {
			const result = resolveFilePath(
				'/project/prisma/schema.prisma',
				'./state.json'
			);

			expect(result).toBe(path.resolve('/project/prisma', './state.json'));
		});

		it('should resolve parent directory paths', () => {
			const result = resolveFilePath(
				'/project/prisma/schema.prisma',
				'../config.json'
			);

			expect(result).toBe(path.resolve('/project/prisma', '../config.json'));
		});

		it('should handle absolute paths', () => {
			const result = resolveFilePath(
				'/project/schema.prisma',
				'/absolute/path/file.txt'
			);

			expect(result).toBe(path.resolve('/project', '/absolute/path/file.txt'));
		});

		it('should handle nested relative paths', () => {
			const result = resolveFilePath(
				'/project/src/modules/schema.prisma',
				'../../data/state.json'
			);

			expect(result).toBe(
				path.resolve('/project/src/modules', '../../data/state.json')
			);
		});

		it('should work with different base paths', () => {
			const result = resolveFilePath(
				'/different/location/schema.prisma',
				'./file.txt'
			);

			expect(result).toBe(path.resolve('/different/location', './file.txt'));
		});

		it('should handle current directory notation', () => {
			const result = resolveFilePath(
				'/project/schema.prisma',
				'./same/dir/file.txt'
			);

			expect(result).toBe(path.resolve('/project', './same/dir/file.txt'));
		});

		it('should extract base directory from file path correctly', () => {
			const basePath = '/project/deep/nested/path/schema.prisma';
			const result = resolveFilePath(basePath, './file.txt');

			// Should resolve relative to the directory containing schema.prisma
			expect(result).toBe(
				path.resolve('/project/deep/nested/path', './file.txt')
			);
		});
	});
});
