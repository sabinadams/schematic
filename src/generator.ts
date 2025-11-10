import { generatorHandler } from '@prisma/generator-helper';
import { generate } from './generate';
import packageJson from '../package.json';

const { version } = packageJson;

generatorHandler({
	onGenerate: generate,
	onManifest() {
		return {
			defaultOutput: '../generated',
			prettyName: 'Schematic Generator',
			version,
		};
	},
});
