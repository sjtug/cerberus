import { NumberFormatError } from './errors.js';
import { Skeleton } from './types/skeleton.js';
/**
 * Returns a number formatter function for the given locales and number skeleton
 *
 * @remarks
 * Uses `Intl.NumberFormat` (ES2020) internally.
 *
 * @public
 * @param locales - One or more valid BCP 47 language tags, e.g. `fr` or `en-CA`
 * @param skeleton - An ICU NumberFormatter pattern or `::`-prefixed skeleton
 *   string, or a parsed `Skeleton` structure
 * @param currency - If `skeleton` is a pattern string that includes ¤ tokens,
 *   their skeleton representation requires a three-letter currency code.
 * @param onError - If defined, will be called separately for each encountered
 *   parsing error and unsupported feature.
 * @example
 * ```js
 * import { getNumberFormatter } from '@messageformat/number-skeleton'
 *
 * let src = ':: currency/CAD unit-width-narrow'
 * let fmt = getNumberFormatter('en-CA', src, console.error)
 * fmt(42) // '$42.00'
 *
 * src = '::percent scale/100'
 * fmt = getNumberFormatter('en', src, console.error)
 * fmt(0.3) // '30%'
 * ```
 */
export declare function getNumberFormatter(locales: string | string[], skeleton: string | Skeleton, currency?: string | null, onError?: (err: NumberFormatError) => void): (value: number) => string;
/**
 * Returns a string of JavaScript source that evaluates to a number formatter
 * function with the same `(value: number) => string` signature as the function
 * returned by {@link getNumberFormatter}.
 *
 * @remarks
 * The returned function will memoize an `Intl.NumberFormat` instance.
 *
 * @public
 * @param locales - One or more valid BCP 47 language tags, e.g. `fr` or `en-CA`
 * @param skeleton - An ICU NumberFormatter pattern or `::`-prefixed skeleton
 *   string, or a parsed `Skeleton` structure
 * @param currency - If `skeleton` is a pattern string that includes ¤ tokens,
 *   their skeleton representation requires a three-letter currency code.
 * @param onError - If defined, will be called separately for each encountered
 *   parsing error and unsupported feature.
 * @example
 * ```js
 * import { getNumberFormatterSource } from '@messageformat/number-skeleton'
 *
 * getNumberFormatterSource('en', '::percent', console.error)
 * // '(function() {\n' +
 * // '  var opt = {"style":"percent"};\n' +
 * // '  var nf = new Intl.NumberFormat(["en"], opt);\n' +
 * // '  var mod = function(n) { return n * 0.01; };\n' +
 * // '  return function(value) { return nf.format(mod(value)); }\n' +
 * // '})()'
 *
 * const src = getNumberFormatterSource('en-CA', ':: currency/CAD unit-width-narrow', console.error)
 * // '(function() {\n' +
 * // '  var opt = {"style":"currency","currency":"CAD","currencyDisplay":"narrowSymbol","unitDisplay":"narrow"};\n' +
 * // '  var nf = new Intl.NumberFormat(["en-CA"], opt);\n'
 * // '  return function(value) { return nf.format(value); }\n' +
 * // '})()'
 * const fmt = new Function(`return ${src}`)()
 * fmt(42) // '$42.00'
 * ```
 */
export declare function getNumberFormatterSource(locales: string | string[], skeleton: string | Skeleton, currency?: string | null, onError?: (err: NumberFormatError) => void): string;
