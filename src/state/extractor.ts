import { logger } from '@prisma/internals';
import { DMMF } from '@prisma/generator-helper';
import {
	Annotation,
	ParsedAnnotation,
	SchematicConfig,
} from '@/types/schematic.types';
import { parseAnnotation } from '@/utils/annotation.utils';
import schemas from '@/schemas/index';
import { State } from '@/types/state.types';

export default function extract(
	dmmf: DMMF.Document,
	config: SchematicConfig
): Omit<State, 'generatedAt' | 'schemaHash'> {
	const annotations = getAnnotations(dmmf, config.annotationPrefix);
	const extractions: ReturnType<(typeof schemas)[keyof typeof schemas]>[] = [];
	annotations.forEach((annotation) => {
		// TODO: We might allow user-defined annotations in the future
		if (!schemas[annotation._schematic_type as keyof typeof schemas]) {
			throw new Error(`Unknown annotation type: ${annotation._schematic_type}`);
		}

		// Validate and format the annotation
		const extraction =
			schemas[annotation._schematic_type as keyof typeof schemas](annotation);

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
 * @returns An array of strings
 */
function getAnnotations(
	dmmf: DMMF.Document,
	annotationPrefix: string
): Annotation[] {
	const annotations: Annotation[] = [];

	for (const model of dmmf.datamodel.models) {
		if (model.documentation) {
			const modelAnnotations = model.documentation
				.split('\n')
				.filter((line: string) =>
					line.trim().startsWith(`@${annotationPrefix}`)
				)
				.map(
					(annotation): Annotation => ({
						model: model.name,
						...parseAnnotation(annotation, annotationPrefix),
					})
				);

			annotations.push(...modelAnnotations);
		}
	}

	return annotations;
}
