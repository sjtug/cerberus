import { NumberFormatError } from '../errors.js';
import { Skeleton } from '../types/skeleton.js';
import { NumberToken } from './number-tokens.js';
export declare function parseNumberAsSkeleton(tokens: NumberToken[], onError: (error: NumberFormatError) => void): Skeleton;
