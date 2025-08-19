export type DateField = 'era' | 'year' | 'quarter' | 'month' | 'week' | 'day' | 'weekday' | 'period' | 'hour' | 'min' | 'sec' | 'sec-frac' | 'ms' | 'tz';
export declare const fields: {
    [symbol: string]: {
        field: DateField;
        desc: string;
    };
};
/**
 * An object representation of a parsed date skeleton token
 *
 * @public
 */
export type DateToken = {
    char: string;
    error?: Error;
    field?: DateField;
    desc?: string;
    str?: string;
    width: number;
};
/**
 * Parse an {@link http://userguide.icu-project.org/formatparse/datetime | ICU
 * DateFormat skeleton} string into a {@link DateToken} array.
 *
 * @remarks
 * Errors will not be thrown, but if encountered are included as the relevant
 * token's `error` value.
 *
 * @public
 * @param src - The skeleton string
 *
 * @example
 * ```js
 * import { parseDateTokens } from '@messageformat/date-skeleton'
 *
 * parseDateTokens('GrMMMdd', console.error)
 * // [
 * //   { char: 'G', field: 'era', desc: 'Era', width: 1 },
 * //   { char: 'r', field: 'year', desc: 'Related Gregorian year', width: 1 },
 * //   { char: 'M', field: 'month', desc: 'Month in year', width: 3 },
 * //   { char: 'd', field: 'day', desc: 'Day in month', width: 2 }
 * // ]
 * ```
 */
export declare function parseDateTokens(src: string): DateToken[];
