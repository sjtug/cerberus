/**
 * Base class for errors. In addition to a `code` and a human-friendly
 * `message`, may also includes the token `stem` as well as other fields.
 *
 * @public
 */
export class NumberFormatError extends Error {
    /** @internal */
    constructor(code, msg) {
        super(msg);
        this.code = code;
    }
}
/** @internal */
export class BadOptionError extends NumberFormatError {
    constructor(stem, opt) {
        super('BAD_OPTION', `Unknown ${stem} option: ${opt}`);
        this.stem = stem;
        this.option = opt;
    }
}
/** @internal */
export class BadStemError extends NumberFormatError {
    constructor(stem) {
        super('BAD_STEM', `Unknown stem: ${stem}`);
        this.stem = stem;
    }
}
/** @internal */
export class MaskedValueError extends NumberFormatError {
    constructor(type, prev) {
        super('MASKED_VALUE', `Value for ${type} is set multiple times`);
        this.type = type;
        this.prev = prev;
    }
}
/** @internal */
export class MissingOptionError extends NumberFormatError {
    constructor(stem) {
        super('MISSING_OPTION', `Required option missing for ${stem}`);
        this.stem = stem;
    }
}
/** @internal */
export class PatternError extends NumberFormatError {
    constructor(char, msg) {
        super('BAD_PATTERN', msg);
        this.char = char;
    }
}
/** @internal */
export class TooManyOptionsError extends NumberFormatError {
    constructor(stem, options, maxOpt) {
        const maxOptStr = maxOpt > 1 ? `${maxOpt} options` : 'one option';
        super('TOO_MANY_OPTIONS', `Token ${stem} only supports ${maxOptStr} (got ${options.length})`);
        this.stem = stem;
        this.options = options;
    }
}
/** @internal */
export class UnsupportedError extends NumberFormatError {
    constructor(stem, source) {
        super('UNSUPPORTED', `The stem ${stem} is not supported`);
        this.stem = stem;
        if (source) {
            this.message += ` with value ${source}`;
            this.source = source;
        }
    }
}
