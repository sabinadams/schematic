import { State } from '@/types/state.types';
import { createHash } from 'crypto';

export default function computeHash(value: string | object): string {
	if (typeof value !== 'string') {
		value = JSON.stringify(value);
	}
	return createHash('sha256').update(value).digest('hex');
}
