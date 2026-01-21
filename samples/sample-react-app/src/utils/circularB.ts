// This file imports circularA, completing the cycle
import { circularA } from './circularA';

export function circularB() {
    return 'B: ' + (typeof circularA === 'function' ? 'has A' : 'no A');
}
