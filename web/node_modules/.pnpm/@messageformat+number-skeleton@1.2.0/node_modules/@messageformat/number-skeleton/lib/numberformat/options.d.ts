import { UnsupportedError } from '../errors.js';
import { Skeleton } from '../types/skeleton.js';
/**
 * Extends `Intl.NumberFormat` options to include some features brought by the
 * {@link https://github.com/tc39/proposal-intl-numberformat-v3 | ECMA-402
 * Proposal: Intl.NumberFormat V3}
 *
 * @internal
 */
export interface NumberFormatOptions extends Intl.NumberFormatOptions {
    trailingZeroDisplay?: 'auto' | 'stripIfInteger';
}
/**
 * Given an input ICU NumberFormatter skeleton, does its best to construct a
 * corresponding `Intl.NumberFormat` options structure.
 *
 * @remarks
 * Some features depend on `Intl.NumberFormat` features defined in ES2020.
 *
 * @internal
 * @param onUnsupported - If defined, called when encountering unsupported (but
 *   valid) tokens, such as `decimal-always` or `permille`. The error `source`
 *   may specify the source of an unsupported option.
 *
 * @example
 * ```js
 * import {
 *   getNumberFormatOptions,
 *   parseNumberSkeleton
 * } from '@messageformat/number-skeleton'
 *
 * const src = 'currency/CAD unit-width-narrow'
 * const skeleton = parseNumberSkeleton(src, console.error)
 * // {
 * //   unit: { style: 'currency', currency: 'CAD' },
 * //   unitWidth: 'unit-width-narrow'
 * // }
 *
 * getNumberFormatOptions(skeleton, console.error)
 * // {
 * //   style: 'currency',
 * //   currency: 'CAD',
 * //   currencyDisplay: 'narrowSymbol',
 * //   unitDisplay: 'narrow'
 * // }
 *
 * const sk2 = parseNumberSkeleton('group-min2')
 * // { group: 'group-min2' }
 *
 * getNumberFormatOptions(sk2, console.error)
 * // Error: The stem group-min2 is not supported
 * //   at UnsupportedError.NumberFormatError ... {
 * //     code: 'UNSUPPORTED',
 * //     stem: 'group-min2'
 * //   }
 * // {}
 * ```
 */
export declare function getNumberFormatOptions(skeleton: Skeleton, onUnsupported?: (err: UnsupportedError) => void): NumberFormatOptions;
