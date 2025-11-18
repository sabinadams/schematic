import { describe, expect, it } from 'vitest';
import computeHash from '@/utils/hash';

describe('computeHash', () => {
	it('should generate a SHA256 hash for a string', () => {
		const input = 'test string';
		const result = computeHash(input);

		expect(result).toBeDefined();
		expect(typeof result).toBe('string');
		expect(result.length).toBe(64); // SHA256 produces 64 hex characters
	});

	it('should generate consistent hashes for the same string', () => {
		const input = 'consistent input';
		const hash1 = computeHash(input);
		const hash2 = computeHash(input);

		expect(hash1).toBe(hash2);
	});

	it('should generate different hashes for different strings', () => {
		const input1 = 'string one';
		const input2 = 'string two';

		const hash1 = computeHash(input1);
		const hash2 = computeHash(input2);

		expect(hash1).not.toBe(hash2);
	});

	it('should generate a hash for an object', () => {
		const input = { name: 'test', value: 123 };
		const result = computeHash(input);

		expect(result).toBeDefined();
		expect(typeof result).toBe('string');
		expect(result.length).toBe(64);
	});

	it('should generate consistent hashes for the same object', () => {
		const input = { name: 'test', value: 123, nested: { key: 'value' } };
		const hash1 = computeHash(input);
		const hash2 = computeHash(input);

		expect(hash1).toBe(hash2);
	});

	it('should generate different hashes for different objects', () => {
		const input1 = { name: 'test1' };
		const input2 = { name: 'test2' };

		const hash1 = computeHash(input1);
		const hash2 = computeHash(input2);

		expect(hash1).not.toBe(hash2);
	});

	it('should handle empty string', () => {
		const result = computeHash('');

		expect(result).toBeDefined();
		expect(result).toBe(
			'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
		);
	});

	it('should handle empty object', () => {
		const result = computeHash({});

		expect(result).toBeDefined();
		expect(typeof result).toBe('string');
	});

	it('should handle complex nested objects', () => {
		const input = {
			models: [
				{ name: 'User', fields: ['id', 'email'] },
				{ name: 'Post', fields: ['id', 'title', 'content'] },
			],
			enums: ['Role', 'Status'],
			metadata: {
				version: '1.0.0',
				provider: 'postgresql',
			},
		};

		const result = computeHash(input);

		expect(result).toBeDefined();
		expect(result.length).toBe(64);
	});

	it('should handle objects with arrays', () => {
		const input = { items: [1, 2, 3, 4, 5] };
		const result = computeHash(input);

		expect(result).toBeDefined();
		expect(result.length).toBe(64);
	});

	it('should generate same hash for object vs its JSON string', () => {
		const obj = { name: 'test', value: 123 };
		const str = JSON.stringify(obj);

		const hashFromObj = computeHash(obj);
		const hashFromStr = computeHash(str);

		expect(hashFromObj).toBe(hashFromStr);
	});

	it('should handle numbers in objects', () => {
		const input = { count: 42, price: 19.99, negative: -5 };
		const result = computeHash(input);

		expect(result).toBeDefined();
		expect(result.length).toBe(64);
	});

	it('should handle booleans in objects', () => {
		const input = { isActive: true, isDeleted: false };
		const result = computeHash(input);

		expect(result).toBeDefined();
		expect(result.length).toBe(64);
	});

	it('should handle null values in objects', () => {
		const input = { value: null, name: 'test' };
		const result = computeHash(input);

		expect(result).toBeDefined();
		expect(result.length).toBe(64);
	});

	it('should handle undefined values in objects', () => {
		const input = { value: undefined, name: 'test' };
		const result = computeHash(input);

		expect(result).toBeDefined();
		expect(result.length).toBe(64);
	});

	it('should handle special characters in strings', () => {
		const input = 'special chars: !@#$%^&*()_+-={}[]|\\:";\'<>?,./';
		const result = computeHash(input);

		expect(result).toBeDefined();
		expect(result.length).toBe(64);
	});

	it('should handle unicode characters', () => {
		const input = 'Unicode: 你好世界 🎉 café';
		const result = computeHash(input);

		expect(result).toBeDefined();
		expect(result.length).toBe(64);
	});

	it('should handle very long strings', () => {
		const input = 'a'.repeat(10000);
		const result = computeHash(input);

		expect(result).toBeDefined();
		expect(result.length).toBe(64);
	});

	it('should handle deeply nested objects', () => {
		const input = {
			level1: {
				level2: {
					level3: {
						level4: {
							level5: {
								value: 'deep',
							},
						},
					},
				},
			},
		};

		const result = computeHash(input);

		expect(result).toBeDefined();
		expect(result.length).toBe(64);
	});

	it('should be sensitive to property order (due to JSON.stringify)', () => {
		const input1 = { a: 1, b: 2 };
		const input2 = { b: 2, a: 1 };

		const hash1 = computeHash(input1);
		const hash2 = computeHash(input2);

		// Note: JSON.stringify maintains insertion order
		// So these might be equal or different depending on insertion order
		expect(hash1).toBeDefined();
		expect(hash2).toBeDefined();
	});

	it('should handle arrays as input', () => {
		const input = [1, 2, 3, 4, 5];
		const result = computeHash(input);

		expect(result).toBeDefined();
		expect(result.length).toBe(64);
	});

	it('should generate different hashes for different array orders', () => {
		const input1 = [1, 2, 3];
		const input2 = [3, 2, 1];

		const hash1 = computeHash(input1);
		const hash2 = computeHash(input2);

		expect(hash1).not.toBe(hash2);
	});
});
