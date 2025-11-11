import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
	test: {
		globals: true,
		environment: 'node',
		include: ['src/**/*.{test,spec}.ts'],
		exclude: ['node_modules', 'dist'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'json', 'html'],
			exclude: [
				'node_modules/',
				'dist/',
				'**/*.config.ts',
				'**/*.config.js',
				'**/test/**',
			],
		},
	},
	resolve: {
		alias: {
			'@utils': path.resolve(__dirname, './src/utils'),
			'@types': path.resolve(__dirname, './src/types'),
		},
	},
});
