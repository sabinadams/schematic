import { Index } from '@/schemas/index.schema';
import { DMMF } from '@prisma/generator-helper';

// interface ExtendedField extends DMMF.Field {}

// interface ExtendedIndex extends DMMF.Index {
// 	where?: string;
// }

// interface ExtendedModel extends DMMF.Model {
// 	fields: ExtendedField[];
// }

// interface ExtendedDatamodel extends DMMF.Datamodel {
// 	indexes: ExtendedIndex[];
// 	models: ExtendedModel[];
// }

interface State {
	generatedAt: string;
	schemaHash: string;
	indexes: Index[];
}

type Extractor<T> = (dmmf: DMMF.Document) => T[];

export type {
	// ExtendedDatamodel,
	// ExtendedModel,
	// ExtendedField,
	// ExtendedIndex,
	Extractor,
	State,
};
