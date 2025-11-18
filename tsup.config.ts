import { defineConfig } from 'tsup';

export default defineConfig({
	entry: ['src/index.ts'],
	format: ['cjs'],
	target: 'node18',
	platform: 'node',
	outDir: 'dist',
	clean: true,
	minify: true,
	sourcemap: true,
	dts: false, // Skip type declarations since we have raw .ts files
	bundle: true,
	splitting: false,
	treeshake: true,
	banner: {
		js: '#!/usr/bin/env node',
	},
	external: ['@prisma/generator-helper', '@prisma/internals', '@prisma/client'],
	onSuccess: 'chmod +x dist/index.js',
});
