import { Skeleton } from './types/skeleton.js';
import { NumberFormatError } from './errors.js';
/**
 * Parse an {@link
 * http://unicode.org/reports/tr35/tr35-numbers.html#Number_Format_Patterns |
 * ICU NumberFormatter pattern} string into a {@link Skeleton} structure.
 *
 * @public
 * @param src - The pattern string
 * @param currency - If the pattern includes ¤ tokens, their skeleton
 *   representation requires a three-letter currency code.
 * @param onError - Called when the parser encounters a syntax error. The
 *   function will still return a {@link Skeleton}, but it will be incomplete
 *   and/or inaccurate. If not defined, the error will be thrown instead.
 *
 * @remarks
 * Unlike the skeleton parser, the pattern parser is not able to return partial
 * results on error, and will instead throw. Output padding is not supported.
 *
 * @example
 * ```js
 * import { parseNumberPattern } from '@messageformat/number-skeleton'
 *
 * parseNumberPattern('#,##0.00 ¤', 'EUR', console.error)
 * // {
 * //   group: 'group-auto',
 * //   precision: {
 * //     style: 'precision-fraction',
 * //     minFraction: 2,
 * //     maxFraction: 2
 * //   },
 * //   unit: { style: 'currency', currency: 'EUR' }
 * // }
 * ```
 */
export declare function parseNumberPattern(src: string, currency?: string | null, onError?: (error: NumberFormatError) => void): Skeleton;
