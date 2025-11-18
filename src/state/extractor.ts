import { logger } from '@prisma/internals';
import { DMMF } from '@prisma/generator-helper';
import {
	Annotation,
	RawParsedAnnotation,
	SchematicConfig,
} from '@/types/schematic.types';
import { parseAnnotation } from '@/utils/annotation.utils';
import schemas, { type SchemaType } from '@/schemas/index';
import { State } from '@/types/state.types';

export default function extract(
	dmmf: DMMF.Document,
	config: SchematicConfig
): Omit<State, 'generatedAt' | 'schemaHash'> {
	const annotations = getAnnotations(dmmf, config.annotationPrefix);
	const extractions: ReturnType<(typeof schemas)[keyof typeof schemas]>[] = [];
	annotations.forEach((annotation) => {
		const schemaType = annotation._schematic_type;

		// Type guard to ensure schemaType is a valid key
		if (!(schemaType in schemas)) {
			throw new Error(`Unknown annotation type: ${schemaType}`);
		}

		// TypeScript now knows schemaType is a valid SchemaType
		// Cast to unknown first to allow the validator to handle the type conversion
		const extraction = schemas[schemaType as SchemaType](annotation as unknown);

		extractions.push(extraction);
	});

	return {
		indexes: extractions.filter(
			(extraction) => extraction._schematic_type === 'index'
		),
	};
}

/**
 * Gets all @schematic.type annotations from the schema and parses them
 * @param dmmf - The DMMF document
 * @returns An array of raw annotations with model info
 */
function getAnnotations(
	dmmf: DMMF.Document,
	annotationPrefix: string
): Array<RawParsedAnnotation & { model: string }> {
	const annotations: Array<RawParsedAnnotation & { model: string }> = [];

	for (const model of dmmf.datamodel.models) {
		if (model.documentation) {
			const modelAnnotations = model.documentation
				.split('\n')
				.filter((line: string) =>
					line.trim().startsWith(`@${annotationPrefix}`)
				)
				.map((annotation) => ({
					model: model.name,
					...parseAnnotation(annotation, annotationPrefix),
				}));

			annotations.push(...modelAnnotations);
		}
	}

	return annotations;
}
