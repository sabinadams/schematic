import { describe, expect, it } from 'vitest';
import { parseAnnotation } from '@utils/annotation.utils';

describe('parseAnnotation', () => {
	it('should parse basic annotation', () => {
		const result = parseAnnotation(
			'@schematic.partialIndex(columns: ["email"], where: "active = true")'
		);

		expect(result).toEqual({
			schematic: 'partial_index',
			columns: ['email'],
			where: 'active = true',
		});
	});

	it('should work without leading @', () => {
		const result = parseAnnotation(
			'schematic.partialIndex(columns: ["email"], where: "active = true")'
		);

		expect(result).toEqual({
			schematic: 'partial_index',
			columns: ['email'],
			where: 'active = true',
		});
	});

	it('should convert camelCase to snake_case', () => {
		const result = parseAnnotation('@schematic.ginIndex(columns: ["title"])');

		expect(result.schematic).toBe('gin_index');
	});

	it('should parse string values', () => {
		const result = parseAnnotation('@schematic.check(name: "valid_email")');

		expect(result).toEqual({
			schematic: 'check',
			name: 'valid_email',
		});
	});

	it('should parse number values', () => {
		const result = parseAnnotation('@schematic.index(priority: 10)');

		expect(result).toEqual({
			schematic: 'index',
			priority: 10,
		});
	});

	it('should parse boolean values', () => {
		const result = parseAnnotation(
			'@schematic.index(unique: true, concurrent: false)'
		);

		expect(result).toEqual({
			schematic: 'index',
			unique: true,
			concurrent: false,
		});
	});

	it('should parse arrays', () => {
		const result = parseAnnotation(
			'@schematic.index(columns: ["email", "name", "id"])'
		);

		expect(result).toEqual({
			schematic: 'index',
			columns: ['email', 'name', 'id'],
		});
	});

	it('should parse multiple arguments', () => {
		const result = parseAnnotation(
			'@schematic.index(columns: ["email"], unique: true, type: "btree")'
		);

		expect(result).toEqual({
			schematic: 'index',
			columns: ['email'],
			unique: true,
			type: 'btree',
		});
	});

	it('should handle SQL expressions', () => {
		const result = parseAnnotation(
			'@schematic.partialIndex(columns: ["status"], where: "status IN (\'active\', \'pending\')")'
		);

		expect(result).toEqual({
			schematic: 'partial_index',
			columns: ['status'],
			where: "status IN ('active', 'pending')",
		});
	});

	it('should handle PostgreSQL expressions', () => {
		const result = parseAnnotation(
			'@schematic.ginIndex(columns: ["title"], expression: "to_tsvector(\'english\', title)")'
		);

		expect(result).toEqual({
			schematic: 'gin_index',
			columns: ['title'],
			expression: "to_tsvector('english', title)",
		});
	});

	it('should handle multiline input', () => {
		const result = parseAnnotation(`@schematic.check(
			name: "valid_user",
			expression: "age >= 18"
		)`);

		expect(result).toEqual({
			schematic: 'check',
			name: 'valid_user',
			expression: 'age >= 18',
		});
	});

	it('should throw on invalid format', () => {
		expect(() => parseAnnotation('@schematic.index')).toThrow(
			'Invalid annotation format'
		);
	});

	it('should handle commas inside string values', () => {
		const result = parseAnnotation(
			"@schematic.check(name: \"status_check\", expression: \"status IN ('active', 'pending', 'done')\")"
		);

		expect(result).toEqual({
			schematic: 'check',
			name: 'status_check',
			expression: "status IN ('active', 'pending', 'done')",
		});
	});

	it('should handle commas in array values', () => {
		const result = parseAnnotation(
			'@schematic.index(columns: ["first,name", "last,name"], type: "btree")'
		);

		expect(result).toEqual({
			schematic: 'index',
			columns: ['first,name', 'last,name'],
			type: 'btree',
		});
	});

	describe('edge cases', () => {
		it('should handle empty arguments', () => {
			const result = parseAnnotation('@schematic.trigger()');

			expect(result).toEqual({
				schematic: 'trigger',
			});
		});

		it('should handle single argument', () => {
			const result = parseAnnotation('@schematic.index(type: "gin")');

			expect(result).toEqual({
				schematic: 'index',
				type: 'gin',
			});
		});

		it('should handle lots of whitespace', () => {
			const result = parseAnnotation(
				'@schematic.index(    columns:   ["email"]   ,   type:   "btree"   )'
			);

			expect(result).toEqual({
				schematic: 'index',
				columns: ['email'],
				type: 'btree',
			});
		});

		it('should handle trailing commas', () => {
			const result = parseAnnotation(
				'@schematic.index(columns: ["email"], type: "btree",)'
			);

			expect(result).toEqual({
				schematic: 'index',
				columns: ['email'],
				type: 'btree',
			});
		});

		it('should handle empty strings', () => {
			const result = parseAnnotation(
				'@schematic.check(name: "", expression: "col IS NOT NULL")'
			);

			expect(result).toEqual({
				schematic: 'check',
				name: '',
				expression: 'col IS NOT NULL',
			});
		});

		it('should handle empty arrays', () => {
			const result = parseAnnotation(
				'@schematic.index(columns: [], options: [])'
			);

			expect(result).toEqual({
				schematic: 'index',
				columns: [],
				options: [],
			});
		});

		it('should handle mixed quote types', () => {
			const result = parseAnnotation(
				`@schematic.check(name: "check", expression: "value = 'test'")`
			);

			expect(result).toEqual({
				schematic: 'check',
				name: 'check',
				expression: "value = 'test'",
			});
		});

		it('should handle null values', () => {
			const result = parseAnnotation(
				'@schematic.index(expression: null, priority: null)'
			);

			expect(result).toEqual({
				schematic: 'index',
				expression: null,
				priority: null,
			});
		});

		it('should handle negative numbers', () => {
			const result = parseAnnotation(
				'@schematic.index(priority: -1, weight: -0.5)'
			);

			expect(result).toEqual({
				schematic: 'index',
				priority: -1,
				weight: -0.5,
			});
		});
	});

	describe('complex cases', () => {
		it('should handle deeply nested arrays', () => {
			const result = parseAnnotation(
				'@schematic.index(matrix: [[1, 2, 3], [4, 5, 6], [7, 8, 9]])'
			);

			expect(result).toEqual({
				schematic: 'index',
				matrix: [
					[1, 2, 3],
					[4, 5, 6],
					[7, 8, 9],
				],
			});
		});

		it('should handle nested objects', () => {
			const result = parseAnnotation(
				'@schematic.index(config: {"db": {"host": "localhost", "port": 5432}, "timeout": 30})'
			);

			expect(result).toEqual({
				schematic: 'index',
				config: {
					db: {
						host: 'localhost',
						port: 5432,
					},
					timeout: 30,
				},
			});
		});

		it('should handle arrays with objects', () => {
			const result = parseAnnotation(
				'@schematic.index(items: [{"name": "a", "value": 1}, {"name": "b", "value": 2}])'
			);

			expect(result).toEqual({
				schematic: 'index',
				items: [
					{ name: 'a', value: 1 },
					{ name: 'b', value: 2 },
				],
			});
		});

		it('should handle complex SQL with parentheses', () => {
			const result = parseAnnotation(
				'@schematic.check(name: "range", expression: "((price >= 0) AND (price <= 1000)) OR (status = \'special\')")'
			);

			expect(result).toEqual({
				schematic: 'check',
				name: 'range',
				expression:
					"((price >= 0) AND (price <= 1000)) OR (status = 'special')",
			});
		});

		it('should handle PostgreSQL function calls', () => {
			const result = parseAnnotation(
				`@schematic.ginIndex(columns: ["content"], expression: "to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, ''))")`
			);

			expect(result).toEqual({
				schematic: 'gin_index',
				columns: ['content'],
				expression:
					"to_tsvector('english', COALESCE(title, '') || ' ' || COALESCE(content, ''))",
			});
		});

		it('should handle multiple arrays and strings', () => {
			const result = parseAnnotation(
				'@schematic.index(columns: ["a", "b", "c"], includes: ["x", "y"], where: "status IN (\'a\', \'b\')", type: "btree")'
			);

			expect(result).toEqual({
				schematic: 'index',
				columns: ['a', 'b', 'c'],
				includes: ['x', 'y'],
				where: "status IN ('a', 'b')",
				type: 'btree',
			});
		});

		it('should handle JSONB expressions', () => {
			const result = parseAnnotation(
				`@schematic.ginIndex(columns: ["data"], expression: "data->>'tags'")`
			);

			expect(result).toEqual({
				schematic: 'gin_index',
				columns: ['data'],
				expression: "data->>'tags'",
			});
		});

		it('should handle very long column lists', () => {
			const result = parseAnnotation(
				'@schematic.index(columns: ["col1", "col2", "col3", "col4", "col5", "col6", "col7", "col8", "col9", "col10"])'
			);

			expect(result).toEqual({
				schematic: 'index',
				columns: [
					'col1',
					'col2',
					'col3',
					'col4',
					'col5',
					'col6',
					'col7',
					'col8',
					'col9',
					'col10',
				],
			});
		});

		it('should handle regex-like expressions', () => {
			const result = parseAnnotation(
				'@schematic.check(name: "email", expression: "email ~ \'^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\\\.[A-Za-z]{2,}$\'")'
			);

			expect(result).toEqual({
				schematic: 'check',
				name: 'email',
				expression:
					"email ~ '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'",
			});
		});

		it('should handle CASE expressions', () => {
			const result = parseAnnotation(
				`@schematic.check(name: "status_check", expression: "CASE WHEN status = 'active' THEN priority > 0 ELSE true END")`
			);

			expect(result).toEqual({
				schematic: 'check',
				name: 'status_check',
				expression:
					"CASE WHEN status = 'active' THEN priority > 0 ELSE true END",
			});
		});
	});
});
