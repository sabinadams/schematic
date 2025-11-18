import { DMMF } from '@prisma/generator-helper';
import computeHash from '@/utils/hash';
import { State } from '@/types/state.types';
import { SchematicConfig } from '@/types/schematic.types';
import extract from './extractor';

export default function buildState(
	dmmf: DMMF.Document,
	config: SchematicConfig
): State {
	const extractions = extract(dmmf, config);

	return {
		generatedAt: new Date().toISOString(),
		schemaHash: computeHash(dmmf),
		...extractions,
	};
}
