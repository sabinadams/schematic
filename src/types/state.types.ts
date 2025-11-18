import { DMMF } from '@prisma/generator-helper';

interface _ExtendedField extends DMMF.Field {}
interface _ExtendedIndex extends DMMF.Index {}

interface _ExtendedModel extends DMMF.Model {
	fields: _ExtendedField[];
}

export interface _ExtendedDatamodel extends DMMF.Datamodel {
	indexes: _ExtendedIndex[];
	models: _ExtendedModel[];
}

export interface State {
	generatedAt: string;
	schemaHash: string;
	indexes: _ExtendedIndex[];
	partialIndexes: _ExtendedIndex[];
	//   checkConstraints: _ExtendedCheckConstraint[];
	//   triggers: _ExtendedTrigger[];
}
