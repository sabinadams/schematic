import { DMMF } from '@prisma/generator-helper';
import computeHash from '@/utils/hash';
import { State } from '@/types/state.types';

export default function buildState(dmmf: DMMF.Document): State {
	return {
		generatedAt: new Date().toISOString(),
		schemaHash: computeHash(dmmf),
		indexes: [],
		partialIndexes: [],
	};
}
