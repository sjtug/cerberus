import { NumberFormatError } from '../errors.js';
import { Skeleton } from '../types/skeleton.js';
/** @internal */
export declare class TokenParser {
    onError: (err: NumberFormatError) => void;
    skeleton: Skeleton;
    constructor(onError: (err: NumberFormatError) => void);
    badOption(stem: string, opt: string): void;
    assertEmpty(key: keyof Skeleton): void;
    parseToken(stem: string, options: string[]): void;
}
