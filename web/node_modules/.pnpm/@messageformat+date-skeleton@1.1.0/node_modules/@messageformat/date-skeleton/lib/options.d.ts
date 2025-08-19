import { DateToken } from './tokens.js';
/**
 * Parent class for errors.
 *
 * @remarks
 * Errors with `type: "warning"` do not necessarily indicate that the parser
 * encountered an error. In addition to a human-friendly `message`, may also
 * includes the `token` at which the error was encountered.
 *
 * @public
 */
export declare class DateFormatError extends Error {
    static ERROR: 'error';
    static WARNING: 'warning';
    token: DateToken;
    type: 'error' | 'warning';
    /** @internal */
    constructor(msg: string, token: DateToken, type?: 'error' | 'warning');
}
export declare function getDateFormatOptions(tokens: DateToken[], timeZone?: string, onError?: (error: DateFormatError) => void): Intl.DateTimeFormatOptions;
