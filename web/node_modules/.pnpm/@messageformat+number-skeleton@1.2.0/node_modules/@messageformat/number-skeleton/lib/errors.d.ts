/**
 * Base class for errors. In addition to a `code` and a human-friendly
 * `message`, may also includes the token `stem` as well as other fields.
 *
 * @public
 */
export declare class NumberFormatError extends Error {
    code: string;
    /** @internal */
    constructor(code: string, msg: string);
}
/** @internal */
export declare class BadOptionError extends NumberFormatError {
    stem: string;
    option: string;
    constructor(stem: string, opt: string);
}
/** @internal */
export declare class BadStemError extends NumberFormatError {
    stem: string;
    constructor(stem: string);
}
/** @internal */
export declare class MaskedValueError extends NumberFormatError {
    type: string;
    prev: unknown;
    constructor(type: string, prev: unknown);
}
/** @internal */
export declare class MissingOptionError extends NumberFormatError {
    stem: string;
    constructor(stem: string);
}
/** @internal */
export declare class PatternError extends NumberFormatError {
    char: string;
    constructor(char: string, msg: string);
}
/** @internal */
export declare class TooManyOptionsError extends NumberFormatError {
    stem: string;
    options: string[];
    constructor(stem: string, options: string[], maxOpt: number);
}
/** @internal */
export declare class UnsupportedError extends NumberFormatError {
    stem: string;
    source?: string;
    constructor(stem: string, source?: string);
}
