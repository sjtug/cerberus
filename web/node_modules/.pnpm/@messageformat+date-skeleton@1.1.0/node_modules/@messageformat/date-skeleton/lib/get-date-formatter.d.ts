import { DateFormatError } from './options.js';
import { DateToken } from './tokens.js';
/**
 * Returns a date formatter function for the given locales and date skeleton
 *
 * @remarks
 * Uses `Intl.DateTimeFormat` internally.
 *
 * @public
 * @param locales - One or more valid BCP 47 language tags, e.g. `fr` or `en-CA`
 * @param tokens - An ICU DateFormat skeleton string, or an array or parsed
 *   `DateToken` tokens
 * @param onError - If defined, will be called separately for each encountered
 *   parsing error and unsupported feature.
 * @example
 * ```js
 * import { getDateFormatter } from '@messageformat/date-skeleton'
 *
 * // 2006 Jan 2, 15:04:05.789 in local time
 * const date = new Date(2006, 0, 2, 15, 4, 5, 789)
 *
 * let fmt = getDateFormatter('en-CA', 'GrMMMdd', console.error)
 * fmt(date) // 'Jan. 02, 2006 AD'
 *
 * fmt = getDateFormatter('en-CA', 'hamszzzz', console.error)
 * fmt(date) // '3:04:05 p.m. Newfoundland Daylight Time'
 * ```
 */
export declare function getDateFormatter(locales: string | string[], tokens: string | DateToken[], timeZone?: string | ((error: DateFormatError) => void), onError?: (error: DateFormatError) => void): (date: Date | number) => string;
/**
 * Returns a string of JavaScript source that evaluates to a date formatter
 * function with the same `(date: Date | number) => string` signature as the
 * function returned by {@link getDateFormatter}.
 *
 * @remarks
 * The returned function will memoize an `Intl.DateTimeFormat` instance.
 *
 * @public
 * @param locales - One or more valid BCP 47 language tags, e.g. `fr` or `en-CA`
 * @param tokens - An ICU DateFormat skeleton string, or an array or parsed
 *   `DateToken` tokens
 * @param onError - If defined, will be called separately for each encountered
 *   parsing error and unsupported feature.
 * @example
 * ```js
 * import { getDateFormatterSource } from '@messageformat/date-skeleton'
 *
 * getDateFormatterSource('en-CA', 'GrMMMdd', console.error)
 * // '(function() {\n' +
 * // '  var opt = {"era":"short","calendar":"gregory","year":"numeric",' +
 * //      '"month":"short","day":"2-digit"};\n' +
 * // '  var dtf = new Intl.DateTimeFormat("en-CA", opt);\n' +
 * // '  return function(value) { return dtf.format(value); }\n' +
 * // '})()'
 *
 * const src = getDateFormatterSource('en-CA', 'hamszzzz', console.error)
 * // '(function() {\n' +
 * // '  var opt = {"hour":"numeric","hourCycle":"h12","minute":"numeric",' +
 * //      '"second":"numeric","timeZoneName":"long"};\n' +
 * // '  var dtf = new Intl.DateTimeFormat("en-CA", opt);\n' +
 * // '  return function(value) { return dtf.format(value); }\n' +
 * // '})()'
 *
 * const fmt = new Function(`return ${src}`)()
 * const date = new Date(2006, 0, 2, 15, 4, 5, 789)
 * fmt(date) // '3:04:05 p.m. Newfoundland Daylight Time'
 * ```
 */
export declare function getDateFormatterSource(locales: string | string[], tokens: string | DateToken[], timeZone?: string | ((err: DateFormatError) => void), onError?: (err: DateFormatError) => void): string;
