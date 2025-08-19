import { NumberFormatError } from './errors.js';
import { Skeleton } from './types/skeleton.js';
/**
 * Parse an {@link
 * https://github.com/unicode-org/icu/blob/master/docs/userguide/format_parse/numbers/skeletons.md
 * | ICU NumberFormatter skeleton} string into a {@link Skeleton} structure.
 *
 * @public
 * @param src - The skeleton string
 * @param onError - Called when the parser encounters a syntax error. The
 *   function will still return a {@link Skeleton}, but it may not contain
 *   information for all tokens. If not defined, the error will be thrown
 *   instead.
 *
 * @example
 * ```js
 * import { parseNumberSkeleton } from '@messageformat/number-skeleton'
 *
 * parseNumberSkeleton('compact-short currency/GBP', console.error)
 * // {
 * //   notation: { style: 'compact-short' },
 * //   unit: { style: 'currency', currency: 'GBP' }
 * // }
 * ```
 */
export declare function parseNumberSkeleton(src: string, onError?: (err: NumberFormatError) => void): Skeleton;
