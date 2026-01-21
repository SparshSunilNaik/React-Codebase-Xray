// This file imports circularB, creating a circular dependency
import { circularB } from './circularB';

export function circularA() {
    return 'A: ' + circularB();
}
