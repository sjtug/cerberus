'use strict';

var parser = require('@messageformat/parser');
var Runtime = require('@messageformat/runtime');
var Formatters = require('@messageformat/runtime/lib/formatters');
var safeIdentifier = require('safe-identifier');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var Runtime__namespace = /*#__PURE__*/_interopNamespaceDefault(Runtime);
var Formatters__namespace = /*#__PURE__*/_interopNamespaceDefault(Formatters);

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
class DateFormatError extends Error {
    /** @internal */
    constructor(msg, token, type) {
        super(msg);
        this.token = token;
        this.type = type || 'error';
    }
}
const alpha = (width) => width < 4 ? 'short' : width === 4 ? 'long' : 'narrow';
const numeric = (width) => (width % 2 === 0 ? '2-digit' : 'numeric');
function yearOptions(token, onError) {
    switch (token.char) {
        case 'y':
            return { year: numeric(token.width) };
        case 'r':
            return { calendar: 'gregory', year: 'numeric' };
        case 'u':
        case 'U':
        case 'Y':
        default:
            onError(`${token.desc} is not supported; falling back to year:numeric`, DateFormatError.WARNING);
            return { year: 'numeric' };
    }
}
function monthStyle(token, onError) {
    switch (token.width) {
        case 1:
            return 'numeric';
        case 2:
            return '2-digit';
        case 3:
            return 'short';
        case 4:
            return 'long';
        case 5:
            return 'narrow';
        default:
            onError(`${token.desc} is not supported with width ${token.width}`);
            return undefined;
    }
}
function dayStyle(token, onError) {
    const { char, desc, width } = token;
    if (char === 'd') {
        return numeric(width);
    }
    else {
        onError(`${desc} is not supported`);
        return undefined;
    }
}
function weekdayStyle(token, onError) {
    const { char, desc, width } = token;
    if ((char === 'c' || char === 'e') && width < 3) {
        // ignoring stand-alone-ness
        const msg = `Numeric value is not supported for ${desc}; falling back to weekday:short`;
        onError(msg, DateFormatError.WARNING);
    }
    // merging narrow styles
    return alpha(width);
}
function hourOptions(token) {
    const hour = numeric(token.width);
    let hourCycle;
    switch (token.char) {
        case 'h':
            hourCycle = 'h12';
            break;
        case 'H':
            hourCycle = 'h23';
            break;
        case 'k':
            hourCycle = 'h24';
            break;
        case 'K':
            hourCycle = 'h11';
            break;
    }
    return hourCycle ? { hour, hourCycle } : { hour };
}
function timeZoneNameStyle(token, onError) {
    // so much fallback behaviour here
    const { char, desc, width } = token;
    switch (char) {
        case 'v':
        case 'z':
            return width === 4 ? 'long' : 'short';
        case 'V':
            if (width === 4)
                return 'long';
            onError(`${desc} is not supported with width ${width}`);
            return undefined;
        case 'X':
            onError(`${desc} is not supported`);
            return undefined;
    }
    return 'short';
}
function compileOptions(token, onError) {
    switch (token.field) {
        case 'era':
            return { era: alpha(token.width) };
        case 'year':
            return yearOptions(token, onError);
        case 'month':
            return { month: monthStyle(token, onError) };
        case 'day':
            return { day: dayStyle(token, onError) };
        case 'weekday':
            return { weekday: weekdayStyle(token, onError) };
        case 'period':
            return undefined;
        case 'hour':
            return hourOptions(token);
        case 'min':
            return { minute: numeric(token.width) };
        case 'sec':
            return { second: numeric(token.width) };
        case 'tz':
            return { timeZoneName: timeZoneNameStyle(token, onError) };
        case 'quarter':
        case 'week':
        case 'sec-frac':
        case 'ms':
            onError(`${token.desc} is not supported`);
    }
    return undefined;
}
function getDateFormatOptions(tokens, timeZone, onError = error => {
    throw error;
}) {
    const options = {
        timeZone
    };
    const fields = [];
    for (const token of tokens) {
        const { error, field, str } = token;
        if (error) {
            const dte = new DateFormatError(error.message, token);
            dte.stack = error.stack;
            onError(dte);
        }
        if (str) {
            const msg = `Ignoring string part: ${str}`;
            onError(new DateFormatError(msg, token, DateFormatError.WARNING));
        }
        if (field) {
            if (fields.indexOf(field) === -1)
                fields.push(field);
            else
                onError(new DateFormatError(`Duplicate ${field} token`, token));
        }
        const opt = compileOptions(token, (msg, isWarning) => onError(new DateFormatError(msg, token, isWarning)));
        if (opt)
            Object.assign(options, opt);
    }
    return options;
}

const fields = {
    G: { field: 'era', desc: 'Era' },
    y: { field: 'year', desc: 'Year' },
    Y: { field: 'year', desc: 'Year of "Week of Year"' },
    u: { field: 'year', desc: 'Extended year' },
    U: { field: 'year', desc: 'Cyclic year name' },
    r: { field: 'year', desc: 'Related Gregorian year' },
    Q: { field: 'quarter', desc: 'Quarter' },
    q: { field: 'quarter', desc: 'Stand-alone quarter' },
    M: { field: 'month', desc: 'Month in year' },
    L: { field: 'month', desc: 'Stand-alone month in year' },
    w: { field: 'week', desc: 'Week of year' },
    W: { field: 'week', desc: 'Week of month' },
    d: { field: 'day', desc: 'Day in month' },
    D: { field: 'day', desc: 'Day of year' },
    F: { field: 'day', desc: 'Day of week in month' },
    g: { field: 'day', desc: 'Modified julian day' },
    E: { field: 'weekday', desc: 'Day of week' },
    e: { field: 'weekday', desc: 'Local day of week' },
    c: { field: 'weekday', desc: 'Stand-alone local day of week' },
    a: { field: 'period', desc: 'AM/PM marker' },
    b: { field: 'period', desc: 'AM/PM/noon/midnight marker' },
    B: { field: 'period', desc: 'Flexible day period' },
    h: { field: 'hour', desc: 'Hour in AM/PM (1~12)' },
    H: { field: 'hour', desc: 'Hour in day (0~23)' },
    k: { field: 'hour', desc: 'Hour in day (1~24)' },
    K: { field: 'hour', desc: 'Hour in AM/PM (0~11)' },
    j: { field: 'hour', desc: 'Hour in preferred cycle' },
    J: { field: 'hour', desc: 'Hour in preferred cycle without marker' },
    C: { field: 'hour', desc: 'Hour in preferred cycle with flexible marker' },
    m: { field: 'min', desc: 'Minute in hour' },
    s: { field: 'sec', desc: 'Second in minute' },
    S: { field: 'sec-frac', desc: 'Fractional second' },
    A: { field: 'ms', desc: 'Milliseconds in day' },
    z: { field: 'tz', desc: 'Time Zone: specific non-location' },
    Z: { field: 'tz', desc: 'Time Zone' },
    O: { field: 'tz', desc: 'Time Zone: localized' },
    v: { field: 'tz', desc: 'Time Zone: generic non-location' },
    V: { field: 'tz', desc: 'Time Zone: ID' },
    X: { field: 'tz', desc: 'Time Zone: ISO8601 with Z' },
    x: { field: 'tz', desc: 'Time Zone: ISO8601' }
};
const isLetter = (char) => (char >= 'A' && char <= 'Z') || (char >= 'a' && char <= 'z');
function readFieldToken(src, pos) {
    const char = src[pos];
    let width = 1;
    while (src[++pos] === char)
        ++width;
    const field = fields[char];
    if (!field) {
        const msg = `The letter ${char} is not a valid field identifier`;
        return { char, error: new Error(msg), width };
    }
    return { char, field: field.field, desc: field.desc, width };
}
function readQuotedToken(src, pos) {
    let str = src[++pos];
    let width = 2;
    if (str === "'")
        return { char: "'", str, width };
    while (true) {
        const next = src[++pos];
        ++width;
        if (next === undefined) {
            const msg = `Unterminated quoted literal in pattern: ${str || src}`;
            return { char: "'", error: new Error(msg), str, width };
        }
        else if (next === "'") {
            if (src[++pos] !== "'")
                return { char: "'", str, width };
            else
                ++width;
        }
        str += next;
    }
}
function readToken(src, pos) {
    const char = src[pos];
    if (!char)
        return null;
    if (isLetter(char))
        return readFieldToken(src, pos);
    if (char === "'")
        return readQuotedToken(src, pos);
    let str = char;
    let width = 1;
    while (true) {
        const next = src[++pos];
        if (!next || isLetter(next) || next === "'")
            return { char, str, width };
        str += next;
        width += 1;
    }
}
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
function parseDateTokens(src) {
    const tokens = [];
    let pos = 0;
    while (true) {
        const token = readToken(src, pos);
        if (!token)
            return tokens;
        tokens.push(token);
        pos += token.width;
    }
}

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
function getDateFormatter(locales, tokens, timeZone, onError) {
    if (typeof tokens === 'string')
        tokens = parseDateTokens(tokens);
    if (typeof timeZone === 'function') {
        onError = timeZone;
        timeZone = undefined;
    }
    const opt = getDateFormatOptions(tokens, timeZone, onError);
    const dtf = new Intl.DateTimeFormat(locales, opt);
    return (date) => dtf.format(date);
}
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
function getDateFormatterSource(locales, tokens, timeZone, onError) {
    if (typeof tokens === 'string')
        tokens = parseDateTokens(tokens);
    if (typeof timeZone === 'function') {
        onError = timeZone;
        timeZone = undefined;
    }
    const opt = getDateFormatOptions(tokens, timeZone, onError);
    const lines = [
        `(function() {`,
        `var opt = ${JSON.stringify(opt)};`,
        `var dtf = new Intl.DateTimeFormat(${JSON.stringify(locales)}, opt);`,
        `return function(value) { return dtf.format(value); }`
    ];
    return lines.join('\n  ') + '\n})()';
}

/**
 * Base class for errors. In addition to a `code` and a human-friendly
 * `message`, may also includes the token `stem` as well as other fields.
 *
 * @public
 */
class NumberFormatError extends Error {
    /** @internal */
    constructor(code, msg) {
        super(msg);
        this.code = code;
    }
}
/** @internal */
class BadOptionError extends NumberFormatError {
    constructor(stem, opt) {
        super('BAD_OPTION', `Unknown ${stem} option: ${opt}`);
        this.stem = stem;
        this.option = opt;
    }
}
/** @internal */
class BadStemError extends NumberFormatError {
    constructor(stem) {
        super('BAD_STEM', `Unknown stem: ${stem}`);
        this.stem = stem;
    }
}
/** @internal */
class MaskedValueError extends NumberFormatError {
    constructor(type, prev) {
        super('MASKED_VALUE', `Value for ${type} is set multiple times`);
        this.type = type;
        this.prev = prev;
    }
}
/** @internal */
class MissingOptionError extends NumberFormatError {
    constructor(stem) {
        super('MISSING_OPTION', `Required option missing for ${stem}`);
        this.stem = stem;
    }
}
/** @internal */
class PatternError extends NumberFormatError {
    constructor(char, msg) {
        super('BAD_PATTERN', msg);
        this.char = char;
    }
}
/** @internal */
class TooManyOptionsError extends NumberFormatError {
    constructor(stem, options, maxOpt) {
        const maxOptStr = maxOpt > 1 ? `${maxOpt} options` : 'one option';
        super('TOO_MANY_OPTIONS', `Token ${stem} only supports ${maxOptStr} (got ${options.length})`);
        this.stem = stem;
        this.options = options;
    }
}
/** @internal */
class UnsupportedError extends NumberFormatError {
    constructor(stem, source) {
        super('UNSUPPORTED', `The stem ${stem} is not supported`);
        this.stem = stem;
        if (source) {
            this.message += ` with value ${source}`;
            this.source = source;
        }
    }
}

/**
 * Add
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation | numbering-system tags}
 * to locale identifiers
 *
 * @internal
 */
function getNumberFormatLocales(locales, { numberingSystem }) {
    if (!Array.isArray(locales))
        locales = [locales];
    return numberingSystem
        ? locales
            .map(lc => {
            const ext = lc.indexOf('-u-') === -1 ? 'u-nu' : 'nu';
            return `${lc}-${ext}-${numberingSystem}`;
        })
            .concat(locales)
        : locales;
}

// from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
function round(x, precision) {
    const y = +x + precision / 2;
    return y - (y % +precision);
}
function getNumberFormatMultiplier({ scale, unit }) {
    let mult = typeof scale === 'number' && scale >= 0 ? scale : 1;
    if (unit && unit.style === 'percent')
        mult *= 0.01;
    return mult;
}
/**
 * Determine a modifier for the input value to account for any `scale`,
 * `percent`, and `precision-increment` tokens in the skeleton.
 *
 * @internal
 * @remarks
 * With ICU NumberFormatter, the `percent` skeleton would style `25` as "25%".
 * To achieve the same with `Intl.NumberFormat`, the input value must be `0.25`.
 */
function getNumberFormatModifier(skeleton) {
    const mult = getNumberFormatMultiplier(skeleton);
    const { precision } = skeleton;
    if (precision && precision.style === 'precision-increment') {
        return (n) => round(n, precision.increment) * mult;
    }
    else {
        return (n) => n * mult;
    }
}
/**
 * Returns a string of JavaScript source that evaluates to a modifier for the
 * input value to account for any `scale`, `percent`, and `precision-increment`
 * tokens in the skeleton.
 *
 * @internal
 * @remarks
 * With ICU NumberFormatter, the `percent` skeleton would style `25` as "25%".
 * To achieve the same with `Intl.NumberFormat`, the input value must be `0.25`.
 */
function getNumberFormatModifierSource(skeleton) {
    const mult = getNumberFormatMultiplier(skeleton);
    const { precision } = skeleton;
    if (precision && precision.style === 'precision-increment') {
        // see round() above for source
        const setX = `+n + ${precision.increment / 2}`;
        let res = `x - (x % +${precision.increment})`;
        if (mult !== 1)
            res = `(${res}) * ${mult}`;
        return `function(n) { var x = ${setX}; return ${res}; }`;
    }
    return mult !== 1 ? `function(n) { return n * ${mult}; }` : null;
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
function getNumberFormatOptions(skeleton, onUnsupported) {
    const { decimal, group, integerWidth, notation, precision, roundingMode, sign, unit, unitPer, unitWidth } = skeleton;
    const fail = (stem, source) => {
        if (onUnsupported)
            onUnsupported(new UnsupportedError(stem, source));
    };
    const opt = {};
    if (unit) {
        switch (unit.style) {
            case 'base-unit':
                opt.style = 'decimal';
                break;
            case 'currency':
                opt.style = 'currency';
                opt.currency = unit.currency;
                break;
            case 'measure-unit':
                opt.style = 'unit';
                opt.unit = unit.unit.replace(/.*-/, '');
                if (unitPer)
                    opt.unit += '-per-' + unitPer.replace(/.*-/, '');
                break;
            case 'percent':
                opt.style = 'percent';
                break;
            case 'permille':
                fail('permille');
                break;
        }
    }
    switch (unitWidth) {
        case 'unit-width-full-name':
            opt.currencyDisplay = 'name';
            opt.unitDisplay = 'long';
            break;
        case 'unit-width-hidden':
            fail(unitWidth);
            break;
        case 'unit-width-iso-code':
            opt.currencyDisplay = 'code';
            break;
        case 'unit-width-narrow':
            opt.currencyDisplay = 'narrowSymbol';
            opt.unitDisplay = 'narrow';
            break;
        case 'unit-width-short':
            opt.currencyDisplay = 'symbol';
            opt.unitDisplay = 'short';
            break;
    }
    switch (group) {
        case 'group-off':
            opt.useGrouping = false;
            break;
        case 'group-auto':
            opt.useGrouping = true;
            break;
        case 'group-min2':
        case 'group-on-aligned':
        case 'group-thousands':
            fail(group);
            opt.useGrouping = true;
            break;
    }
    if (precision) {
        switch (precision.style) {
            case 'precision-fraction': {
                const { minFraction: minF, maxFraction: maxF, minSignificant: minS, maxSignificant: maxS, source } = precision;
                if (typeof minF === 'number') {
                    opt.minimumFractionDigits = minF;
                    if (typeof minS === 'number')
                        fail('precision-fraction', source);
                }
                if (typeof maxF === 'number')
                    opt.maximumFractionDigits = maxF;
                if (typeof minS === 'number')
                    opt.minimumSignificantDigits = minS;
                if (typeof maxS === 'number')
                    opt.maximumSignificantDigits = maxS;
                break;
            }
            case 'precision-integer':
                opt.maximumFractionDigits = 0;
                break;
            case 'precision-unlimited':
                opt.maximumFractionDigits = 20;
                break;
            case 'precision-increment':
                break;
            case 'precision-currency-standard':
                opt.trailingZeroDisplay = precision.trailingZero;
                break;
            case 'precision-currency-cash':
                fail(precision.style);
                break;
        }
    }
    if (notation) {
        switch (notation.style) {
            case 'compact-short':
                opt.notation = 'compact';
                opt.compactDisplay = 'short';
                break;
            case 'compact-long':
                opt.notation = 'compact';
                opt.compactDisplay = 'long';
                break;
            case 'notation-simple':
                opt.notation = 'standard';
                break;
            case 'scientific':
            case 'engineering': {
                const { expDigits, expSign, source, style } = notation;
                opt.notation = style;
                if ((expDigits && expDigits > 1) ||
                    (expSign && expSign !== 'sign-auto')) {
                    fail(style, source);
                }
                break;
            }
        }
    }
    if (integerWidth) {
        const { min, max, source } = integerWidth;
        if (min > 0)
            opt.minimumIntegerDigits = min;
        if (Number(max) > 0) {
            const hasExp = opt.notation === 'engineering' || opt.notation === 'scientific';
            if (max === 3 && hasExp)
                opt.notation = 'engineering';
            else
                fail('integer-width', source);
        }
    }
    switch (sign) {
        case 'sign-auto':
            opt.signDisplay = 'auto';
            break;
        case 'sign-always':
            opt.signDisplay = 'always';
            break;
        case 'sign-except-zero':
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore https://github.com/microsoft/TypeScript/issues/46712
            opt.signDisplay = 'exceptZero';
            break;
        case 'sign-never':
            opt.signDisplay = 'never';
            break;
        case 'sign-accounting':
            opt.currencySign = 'accounting';
            break;
        case 'sign-accounting-always':
            opt.currencySign = 'accounting';
            opt.signDisplay = 'always';
            break;
        case 'sign-accounting-except-zero':
            opt.currencySign = 'accounting';
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore https://github.com/microsoft/TypeScript/issues/46712
            opt.signDisplay = 'exceptZero';
            break;
    }
    if (decimal === 'decimal-always')
        fail(decimal);
    if (roundingMode)
        fail(roundingMode);
    return opt;
}

function parseAffixToken(src, pos, onError) {
    const char = src[pos];
    switch (char) {
        case '%':
            return { char: '%', style: 'percent', width: 1 };
        case '‰':
            return { char: '%', style: 'permille', width: 1 };
        case '¤': {
            let width = 1;
            while (src[++pos] === '¤')
                ++width;
            switch (width) {
                case 1:
                    return { char, currency: 'default', width };
                case 2:
                    return { char, currency: 'iso-code', width };
                case 3:
                    return { char, currency: 'full-name', width };
                case 5:
                    return { char, currency: 'narrow', width };
                default: {
                    const msg = `Invalid number (${width}) of ¤ chars in pattern`;
                    onError(new PatternError('¤', msg));
                    return null;
                }
            }
        }
        case '*': {
            const pad = src[pos + 1];
            if (pad)
                return { char, pad, width: 2 };
            break;
        }
        case '+':
        case '-':
            return { char, width: 1 };
        case "'": {
            let str = src[++pos];
            let width = 2;
            if (str === "'")
                return { char, str, width };
            while (true) {
                const next = src[++pos];
                ++width;
                if (next === undefined) {
                    const msg = `Unterminated quoted literal in pattern: ${str}`;
                    onError(new PatternError("'", msg));
                    return { char, str, width };
                }
                else if (next === "'") {
                    if (src[++pos] !== "'")
                        return { char, str, width };
                    else
                        ++width;
                }
                str += next;
            }
        }
    }
    return null;
}

const isDigit = (char) => char >= '0' && char <= '9';
function parseNumberToken(src, pos) {
    const char = src[pos];
    if (isDigit(char)) {
        let digits = char;
        while (true) {
            const next = src[++pos];
            if (isDigit(next))
                digits += next;
            else
                return { char: '0', digits, width: digits.length };
        }
    }
    switch (char) {
        case '#': {
            let width = 1;
            while (src[++pos] === '#')
                ++width;
            return { char, width };
        }
        case '@': {
            let min = 1;
            while (src[++pos] === '@')
                ++min;
            let width = min;
            pos -= 1;
            while (src[++pos] === '#')
                ++width;
            return { char, min, width };
        }
        case 'E': {
            const plus = src[pos + 1] === '+';
            if (plus)
                ++pos;
            let expDigits = 0;
            while (src[++pos] === '0')
                ++expDigits;
            const width = (plus ? 2 : 1) + expDigits;
            if (expDigits)
                return { char, expDigits, plus, width };
            else
                break;
        }
        case '.':
        case ',':
            return { char, width: 1 };
    }
    return null;
}

function parseSubpattern(src, pos, onError) {
    let State;
    (function (State) {
        State[State["Prefix"] = 0] = "Prefix";
        State[State["Number"] = 1] = "Number";
        State[State["Suffix"] = 2] = "Suffix";
    })(State || (State = {}));
    const prefix = [];
    const number = [];
    const suffix = [];
    let state = State.Prefix;
    let str = '';
    while (pos < src.length) {
        const char = src[pos];
        if (char === ';') {
            pos += 1;
            break;
        }
        switch (state) {
            case State.Prefix: {
                const token = parseAffixToken(src, pos, onError);
                if (token) {
                    if (str) {
                        prefix.push({ char: "'", str, width: str.length });
                        str = '';
                    }
                    prefix.push(token);
                    pos += token.width;
                }
                else {
                    const token = parseNumberToken(src, pos);
                    if (token) {
                        if (str) {
                            prefix.push({ char: "'", str, width: str.length });
                            str = '';
                        }
                        state = State.Number;
                        number.push(token);
                        pos += token.width;
                    }
                    else {
                        str += char;
                        pos += 1;
                    }
                }
                break;
            }
            case State.Number: {
                const token = parseNumberToken(src, pos);
                if (token) {
                    number.push(token);
                    pos += token.width;
                }
                else {
                    state = State.Suffix;
                }
                break;
            }
            case State.Suffix: {
                const token = parseAffixToken(src, pos, onError);
                if (token) {
                    if (str) {
                        suffix.push({ char: "'", str, width: str.length });
                        str = '';
                    }
                    suffix.push(token);
                    pos += token.width;
                }
                else {
                    str += char;
                    pos += 1;
                }
                break;
            }
        }
    }
    if (str)
        suffix.push({ char: "'", str, width: str.length });
    return { pattern: { prefix, number, suffix }, pos };
}
function parseTokens(src, onError) {
    const { pattern, pos } = parseSubpattern(src, 0, onError);
    if (pos < src.length) {
        const { pattern: negative } = parseSubpattern(src, pos, onError);
        return { tokens: pattern, negative };
    }
    return { tokens: pattern };
}

function parseNumberAsSkeleton(tokens, onError) {
    const res = {};
    let hasGroups = false;
    let hasExponent = false;
    let intOptional = 0;
    let intDigits = '';
    let decimalPos = -1;
    let fracDigits = '';
    let fracOptional = 0;
    for (let pos = 0; pos < tokens.length; ++pos) {
        const token = tokens[pos];
        switch (token.char) {
            case '#': {
                if (decimalPos === -1) {
                    if (intDigits) {
                        const msg = 'Pattern has # after integer digits';
                        onError(new PatternError('#', msg));
                    }
                    intOptional += token.width;
                }
                else {
                    fracOptional += token.width;
                }
                break;
            }
            case '0': {
                if (decimalPos === -1) {
                    intDigits += token.digits;
                }
                else {
                    if (fracOptional) {
                        const msg = 'Pattern has digits after # in fraction';
                        onError(new PatternError('0', msg));
                    }
                    fracDigits += token.digits;
                }
                break;
            }
            case '@': {
                if (res.precision) {
                    onError(new MaskedValueError('precision', res.precision));
                }
                res.precision = {
                    style: 'precision-fraction',
                    minSignificant: token.min,
                    maxSignificant: token.width
                };
                break;
            }
            case ',':
                hasGroups = true;
                break;
            case '.':
                if (decimalPos === 1) {
                    const msg = 'Pattern has more than one decimal separator';
                    onError(new PatternError('.', msg));
                }
                decimalPos = pos;
                break;
            case 'E': {
                if (hasExponent) {
                    onError(new MaskedValueError('exponent', res.notation));
                }
                if (hasGroups) {
                    const msg = 'Exponential patterns may not contain grouping separators';
                    onError(new PatternError('E', msg));
                }
                res.notation = { style: 'scientific' };
                if (token.expDigits > 1)
                    res.notation.expDigits = token.expDigits;
                if (token.plus)
                    res.notation.expSign = 'sign-always';
                hasExponent = true;
            }
        }
    }
    // imprecise mapping due to paradigm differences
    if (hasGroups)
        res.group = 'group-auto';
    else if (intOptional + intDigits.length > 3)
        res.group = 'group-off';
    const increment = Number(`${intDigits || '0'}.${fracDigits}`);
    if (increment)
        res.precision = { style: 'precision-increment', increment };
    if (!hasExponent) {
        if (intDigits.length > 1)
            res.integerWidth = { min: intDigits.length };
        if (!res.precision && (fracDigits.length || fracOptional)) {
            res.precision = {
                style: 'precision-fraction',
                minFraction: fracDigits.length,
                maxFraction: fracDigits.length + fracOptional
            };
        }
    }
    else {
        if (!res.precision || increment) {
            res.integerWidth = intOptional
                ? { min: 1, max: intOptional + intDigits.length }
                : { min: Math.max(1, intDigits.length) };
        }
        if (res.precision) {
            if (!increment)
                res.integerWidth = { min: 1, max: 1 };
        }
        else {
            const dc = intDigits.length + fracDigits.length;
            if (decimalPos === -1) {
                if (dc > 0) {
                    res.precision = { style: 'precision-fraction', maxSignificant: dc };
                }
            }
            else {
                res.precision = {
                    style: 'precision-fraction',
                    maxSignificant: Math.max(1, dc) + fracOptional
                };
                if (dc > 1)
                    res.precision.minSignificant = dc;
            }
        }
    }
    return res;
}

function handleAffix(affixTokens, res, currency, onError, isPrefix) {
    let inFmt = false;
    let str = '';
    for (const token of affixTokens) {
        switch (token.char) {
            case '%':
                res.unit = { style: token.style };
                if (isPrefix)
                    inFmt = true;
                else
                    str = '';
                break;
            case '¤':
                if (!currency) {
                    const msg = `The ¤ pattern requires a currency`;
                    onError(new PatternError('¤', msg));
                    break;
                }
                res.unit = { style: 'currency', currency };
                switch (token.currency) {
                    case 'iso-code':
                        res.unitWidth = 'unit-width-iso-code';
                        break;
                    case 'full-name':
                        res.unitWidth = 'unit-width-full-name';
                        break;
                    case 'narrow':
                        res.unitWidth = 'unit-width-narrow';
                        break;
                }
                if (isPrefix)
                    inFmt = true;
                else
                    str = '';
                break;
            case '*':
                // TODO
                break;
            case '+':
                if (!inFmt)
                    str += '+';
                break;
            case "'":
                if (!inFmt)
                    str += token.str;
                break;
        }
    }
    return str;
}
function getNegativeAffix(affixTokens, isPrefix) {
    let inFmt = false;
    let str = '';
    for (const token of affixTokens) {
        switch (token.char) {
            case '%':
            case '¤':
                if (isPrefix)
                    inFmt = true;
                else
                    str = '';
                break;
            case '-':
                if (!inFmt)
                    str += '-';
                break;
            case "'":
                if (!inFmt)
                    str += token.str;
                break;
        }
    }
    return str;
}
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
function parseNumberPattern(src, currency, onError = error => {
    throw error;
}) {
    const { tokens, negative } = parseTokens(src, onError);
    const res = parseNumberAsSkeleton(tokens.number, onError);
    const prefix = handleAffix(tokens.prefix, res, currency, onError, true);
    const suffix = handleAffix(tokens.suffix, res, currency, onError, false);
    if (negative) {
        const negPrefix = getNegativeAffix(negative.prefix, true);
        const negSuffix = getNegativeAffix(negative.suffix, false);
        res.affix = { pos: [prefix, suffix], neg: [negPrefix, negSuffix] };
        res.sign = 'sign-never';
    }
    else if (prefix || suffix) {
        res.affix = { pos: [prefix, suffix] };
    }
    return res;
}

/** @internal */
function isNumberingSystem(ns) {
    const systems = [
        'arab',
        'arabext',
        'bali',
        'beng',
        'deva',
        'fullwide',
        'gujr',
        'guru',
        'hanidec',
        'khmr',
        'knda',
        'laoo',
        'latn',
        'limb',
        'mlym',
        'mong',
        'mymr',
        'orya',
        'tamldec',
        'telu',
        'thai',
        'tibt'
    ];
    return systems.indexOf(ns) !== -1;
}

// FIXME: subtype is not checked
/** @internal */
function isUnit(unit) {
    const types = [
        'acceleration',
        'angle',
        'area',
        'concentr',
        'consumption',
        'digital',
        'duration',
        'electric',
        'energy',
        'force',
        'frequency',
        'graphics',
        'length',
        'light',
        'mass',
        'power',
        'pressure',
        'speed',
        'temperature',
        'torque',
        'volume'
    ];
    const [type] = unit.split('-', 1);
    return types.indexOf(type) !== -1;
}

const maxOptions = {
    'compact-short': 0,
    'compact-long': 0,
    'notation-simple': 0,
    scientific: 2,
    engineering: 2,
    percent: 0,
    permille: 0,
    'base-unit': 0,
    currency: 1,
    'measure-unit': 1,
    'per-measure-unit': 1,
    'unit-width-narrow': 0,
    'unit-width-short': 0,
    'unit-width-full-name': 0,
    'unit-width-iso-code': 0,
    'unit-width-hidden': 0,
    'precision-integer': 0,
    'precision-unlimited': 0,
    'precision-currency-standard': 1,
    'precision-currency-cash': 0,
    'precision-increment': 1,
    'rounding-mode-ceiling': 0,
    'rounding-mode-floor': 0,
    'rounding-mode-down': 0,
    'rounding-mode-up': 0,
    'rounding-mode-half-even': 0,
    'rounding-mode-half-down': 0,
    'rounding-mode-half-up': 0,
    'rounding-mode-unnecessary': 0,
    'integer-width': 1,
    scale: 1,
    'group-off': 0,
    'group-min2': 0,
    'group-auto': 0,
    'group-on-aligned': 0,
    'group-thousands': 0,
    latin: 0,
    'numbering-system': 1,
    'sign-auto': 0,
    'sign-always': 0,
    'sign-never': 0,
    'sign-accounting': 0,
    'sign-accounting-always': 0,
    'sign-except-zero': 0,
    'sign-accounting-except-zero': 0,
    'decimal-auto': 0,
    'decimal-always': 0
};
const minOptions = {
    currency: 1,
    'integer-width': 1,
    'measure-unit': 1,
    'numbering-system': 1,
    'per-measure-unit': 1,
    'precision-increment': 1,
    scale: 1
};
function hasMaxOption(stem) {
    return stem in maxOptions;
}
function hasMinOption(stem) {
    return stem in minOptions;
}
/** @internal */
function validOptions(stem, options, onError) {
    if (hasMaxOption(stem)) {
        const maxOpt = maxOptions[stem];
        if (options.length > maxOpt) {
            if (maxOpt === 0) {
                for (const opt of options)
                    onError(new BadOptionError(stem, opt));
            }
            else {
                onError(new TooManyOptionsError(stem, options, maxOpt));
            }
            return false;
        }
        else if (hasMinOption(stem) && options.length < minOptions[stem]) {
            onError(new MissingOptionError(stem));
            return false;
        }
    }
    return true;
}

function parseBlueprintDigits(src, style) {
    const re = style === 'fraction' ? /^\.(0*)(\+|#*)$/ : /^(@+)(\+|#*)$/;
    const match = src && src.match(re);
    if (match) {
        const min = match[1].length;
        switch (match[2].charAt(0)) {
            case '':
                return { min, max: min };
            case '+':
                return { min, max: null };
            case '#': {
                return { min, max: min + match[2].length };
            }
        }
    }
    return null;
}
function parsePrecisionBlueprint(stem, options, onError) {
    const fd = parseBlueprintDigits(stem, 'fraction');
    if (fd) {
        if (options.length > 1)
            onError(new TooManyOptionsError(stem, options, 1));
        const res = {
            style: 'precision-fraction',
            source: stem,
            minFraction: fd.min
        };
        if (fd.max != null)
            res.maxFraction = fd.max;
        const option = options[0];
        const sd = parseBlueprintDigits(option, 'significant');
        if (sd) {
            res.source = `${stem}/${option}`;
            res.minSignificant = sd.min;
            if (sd.max != null)
                res.maxSignificant = sd.max;
        }
        else if (option) {
            onError(new BadOptionError(stem, option));
        }
        return res;
    }
    const sd = parseBlueprintDigits(stem, 'significant');
    if (sd) {
        for (const opt of options)
            onError(new BadOptionError(stem, opt));
        const res = {
            style: 'precision-fraction',
            source: stem,
            minSignificant: sd.min
        };
        if (sd.max != null)
            res.maxSignificant = sd.max;
        return res;
    }
    return null;
}

/** @internal */
class TokenParser {
    constructor(onError) {
        this.skeleton = {};
        this.onError = onError;
    }
    badOption(stem, opt) {
        this.onError(new BadOptionError(stem, opt));
    }
    assertEmpty(key) {
        const prev = this.skeleton[key];
        if (prev)
            this.onError(new MaskedValueError(key, prev));
    }
    parseToken(stem, options) {
        if (!validOptions(stem, options, this.onError))
            return;
        const option = options[0];
        const res = this.skeleton;
        switch (stem) {
            // notation
            case 'compact-short':
            case 'compact-long':
            case 'notation-simple':
                this.assertEmpty('notation');
                res.notation = { style: stem };
                break;
            case 'scientific':
            case 'engineering': {
                let expDigits = null;
                let expSign = undefined;
                for (const opt of options) {
                    switch (opt) {
                        case 'sign-auto':
                        case 'sign-always':
                        case 'sign-never':
                        case 'sign-accounting':
                        case 'sign-accounting-always':
                        case 'sign-except-zero':
                        case 'sign-accounting-except-zero':
                            expSign = opt;
                            break;
                        default:
                            if (/^\+e+$/.test(opt)) {
                                expDigits = opt.length - 1;
                            }
                            else {
                                this.badOption(stem, opt);
                            }
                    }
                }
                this.assertEmpty('notation');
                const source = options.join('/');
                res.notation =
                    expDigits && expSign
                        ? { style: stem, source, expDigits, expSign }
                        : expDigits
                            ? { style: stem, source, expDigits }
                            : expSign
                                ? { style: stem, source, expSign }
                                : { style: stem, source };
                break;
            }
            // unit
            case 'percent':
            case 'permille':
            case 'base-unit':
                this.assertEmpty('unit');
                res.unit = { style: stem };
                break;
            case 'currency':
                if (/^[A-Z]{3}$/.test(option)) {
                    this.assertEmpty('unit');
                    res.unit = { style: stem, currency: option };
                }
                else {
                    this.badOption(stem, option);
                }
                break;
            case 'measure-unit': {
                if (isUnit(option)) {
                    this.assertEmpty('unit');
                    res.unit = { style: stem, unit: option };
                }
                else {
                    this.badOption(stem, option);
                }
                break;
            }
            // unitPer
            case 'per-measure-unit': {
                if (isUnit(option)) {
                    this.assertEmpty('unitPer');
                    res.unitPer = option;
                }
                else {
                    this.badOption(stem, option);
                }
                break;
            }
            // unitWidth
            case 'unit-width-narrow':
            case 'unit-width-short':
            case 'unit-width-full-name':
            case 'unit-width-iso-code':
            case 'unit-width-hidden':
                this.assertEmpty('unitWidth');
                res.unitWidth = stem;
                break;
            // precision
            case 'precision-integer':
            case 'precision-unlimited':
            case 'precision-currency-cash':
                this.assertEmpty('precision');
                res.precision = { style: stem };
                break;
            case 'precision-currency-standard':
                this.assertEmpty('precision');
                if (option === 'w') {
                    res.precision = { style: stem, trailingZero: 'stripIfInteger' };
                }
                else {
                    res.precision = { style: stem };
                }
                break;
            case 'precision-increment': {
                const increment = Number(option);
                if (increment > 0) {
                    this.assertEmpty('precision');
                    res.precision = { style: stem, increment };
                }
                else {
                    this.badOption(stem, option);
                }
                break;
            }
            // roundingMode
            case 'rounding-mode-ceiling':
            case 'rounding-mode-floor':
            case 'rounding-mode-down':
            case 'rounding-mode-up':
            case 'rounding-mode-half-even':
            case 'rounding-mode-half-odd':
            case 'rounding-mode-half-ceiling':
            case 'rounding-mode-half-floor':
            case 'rounding-mode-half-down':
            case 'rounding-mode-half-up':
            case 'rounding-mode-unnecessary':
                this.assertEmpty('roundingMode');
                res.roundingMode = stem;
                break;
            // integerWidth
            case 'integer-width': {
                if (/^\+0*$/.test(option)) {
                    this.assertEmpty('integerWidth');
                    res.integerWidth = { source: option, min: option.length - 1 };
                }
                else {
                    const m = option.match(/^#*(0*)$/);
                    if (m) {
                        this.assertEmpty('integerWidth');
                        res.integerWidth = {
                            source: option,
                            min: m[1].length,
                            max: m[0].length
                        };
                    }
                    else {
                        this.badOption(stem, option);
                    }
                }
                break;
            }
            // scale
            case 'scale': {
                const scale = Number(option);
                if (scale > 0) {
                    this.assertEmpty('scale');
                    res.scale = scale;
                }
                else {
                    this.badOption(stem, option);
                }
                break;
            }
            // group
            case 'group-off':
            case 'group-min2':
            case 'group-auto':
            case 'group-on-aligned':
            case 'group-thousands':
                this.assertEmpty('group');
                res.group = stem;
                break;
            // numberingSystem
            case 'latin':
                this.assertEmpty('numberingSystem');
                res.numberingSystem = 'latn';
                break;
            case 'numbering-system': {
                if (isNumberingSystem(option)) {
                    this.assertEmpty('numberingSystem');
                    res.numberingSystem = option;
                }
                else {
                    this.badOption(stem, option);
                }
                break;
            }
            // sign
            case 'sign-auto':
            case 'sign-always':
            case 'sign-never':
            case 'sign-accounting':
            case 'sign-accounting-always':
            case 'sign-except-zero':
            case 'sign-accounting-except-zero':
                this.assertEmpty('sign');
                res.sign = stem;
                break;
            // decimal
            case 'decimal-auto':
            case 'decimal-always':
                this.assertEmpty('decimal');
                res.decimal = stem;
                break;
            // precision blueprint
            default: {
                const precision = parsePrecisionBlueprint(stem, options, this.onError);
                if (precision) {
                    this.assertEmpty('precision');
                    res.precision = precision;
                }
                else {
                    this.onError(new BadStemError(stem));
                }
            }
        }
    }
}

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
function parseNumberSkeleton(src, onError = error => {
    throw error;
}) {
    const tokens = [];
    for (const part of src.split(' ')) {
        if (part) {
            const options = part.split('/');
            const stem = options.shift() || '';
            tokens.push({ stem, options });
        }
    }
    const parser = new TokenParser(onError);
    for (const { stem, options } of tokens) {
        parser.parseToken(stem, options);
    }
    return parser.skeleton;
}

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
function getNumberFormatter(locales, skeleton, currency, onError) {
    if (typeof skeleton === 'string') {
        skeleton =
            skeleton.indexOf('::') === 0
                ? parseNumberSkeleton(skeleton.slice(2), onError)
                : parseNumberPattern(skeleton, currency, onError);
    }
    const lc = getNumberFormatLocales(locales, skeleton);
    const opt = getNumberFormatOptions(skeleton, onError);
    const mod = getNumberFormatModifier(skeleton);
    const nf = new Intl.NumberFormat(lc, opt);
    if (skeleton.affix) {
        const [p0, p1] = skeleton.affix.pos;
        const [n0, n1] = skeleton.affix.neg || ['', ''];
        return (value) => {
            const n = nf.format(mod(value));
            return value < 0 ? `${n0}${n}${n1}` : `${p0}${n}${p1}`;
        };
    }
    return (value) => nf.format(mod(value));
}
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
function getNumberFormatterSource(locales, skeleton, currency, onError) {
    if (typeof skeleton === 'string') {
        skeleton =
            skeleton.indexOf('::') === 0
                ? parseNumberSkeleton(skeleton.slice(2), onError)
                : parseNumberPattern(skeleton, currency, onError);
    }
    const lc = getNumberFormatLocales(locales, skeleton);
    const opt = getNumberFormatOptions(skeleton, onError);
    const modSrc = getNumberFormatModifierSource(skeleton);
    const lines = [
        `(function() {`,
        `var opt = ${JSON.stringify(opt)};`,
        `var nf = new Intl.NumberFormat(${JSON.stringify(lc)}, opt);`
    ];
    let res = 'nf.format(value)';
    if (modSrc) {
        lines.push(`var mod = ${modSrc};`);
        res = 'nf.format(mod(value))';
    }
    if (skeleton.affix) {
        const [p0, p1] = skeleton.affix.pos.map(s => JSON.stringify(s));
        if (skeleton.affix.neg) {
            const [n0, n1] = skeleton.affix.neg.map(s => JSON.stringify(s));
            res = `value < 0 ? ${n0} + ${res} + ${n1} : ${p0} + ${res} + ${p1}`;
        }
        else {
            res = `${p0} + ${res} + ${p1}`;
        }
    }
    lines.push(`return function(value) { return ${res}; }`);
    return lines.join('\n  ') + '\n})()';
}

const rtlLanguages = [
    'ar',
    'ckb',
    'fa',
    'he',
    'ks($|[^bfh])',
    'lrc',
    'mzn',
    'pa-Arab',
    'ps',
    'ug',
    'ur',
    'uz-Arab',
    'yi'
];
const rtlRegExp = new RegExp('^' + rtlLanguages.join('|^'));
function biDiMarkText(text, locale) {
    const isLocaleRTL = rtlRegExp.test(locale);
    const mark = JSON.stringify(isLocaleRTL ? '\u200F' : '\u200E');
    return `${mark} + ${text} + ${mark}`;
}

const RUNTIME_MODULE = '@messageformat/runtime';
const CARDINAL_MODULE = '@messageformat/runtime/lib/cardinals';
const PLURAL_MODULE = '@messageformat/runtime/lib/plurals';
const FORMATTER_MODULE = '@messageformat/runtime/lib/formatters';
class Compiler {
    constructor(options) {
        this.arguments = [];
        this.runtime = {};
        this.options = options;
    }
    compile(src, plural, plurals) {
        const { localeCodeFromKey, requireAllArguments, strict, strictPluralKeys } = this.options;
        if (typeof src === 'object') {
            const result = {};
            for (const key of Object.keys(src)) {
                const lc = localeCodeFromKey ? localeCodeFromKey(key) : key;
                const pl = (plurals && lc && plurals[lc]) || plural;
                result[key] = this.compile(src[key], pl, plurals);
            }
            return result;
        }
        this.plural = plural;
        const parserOptions = {
            cardinal: plural.cardinals,
            ordinal: plural.ordinals,
            strict,
            strictPluralKeys
        };
        this.arguments = [];
        const r = parser.parse(src, parserOptions).map(token => this.token(token, null));
        const hasArgs = this.arguments.length > 0;
        const res = this.concatenate(r, true);
        if (requireAllArguments && hasArgs) {
            this.setRuntimeFn('reqArgs');
            const reqArgs = JSON.stringify(this.arguments);
            return `(d) => { reqArgs(${reqArgs}, d); return ${res}; }`;
        }
        return `(${hasArgs ? 'd' : ''}) => ${res}`;
    }
    cases(token, pluralToken) {
        let needOther = true;
        const r = token.cases.map(({ key, tokens }) => {
            if (key === 'other')
                needOther = false;
            const s = tokens.map(tok => this.token(tok, pluralToken));
            return `${safeIdentifier.property(null, key.replace(/^=/, ''))}: ${this.concatenate(s, false)}`;
        });
        if (needOther) {
            const { type } = token;
            const { cardinals, ordinals } = this.plural;
            if (type === 'select' ||
                (type === 'plural' && cardinals.includes('other')) ||
                (type === 'selectordinal' && ordinals.includes('other'))) {
                throw new Error(`No 'other' form found in ${JSON.stringify(token)}`);
            }
        }
        return `{ ${r.join(', ')} }`;
    }
    concatenate(tokens, root) {
        const asValues = this.options.returnType === 'values';
        return asValues && (root || tokens.length > 1)
            ? '[' + tokens.join(', ') + ']'
            : tokens.join(' + ') || '""';
    }
    token(token, pluralToken) {
        if (token.type === 'content')
            return JSON.stringify(token.value);
        const { id, lc } = this.plural;
        let args, fn;
        if ('arg' in token) {
            this.arguments.push(token.arg);
            args = [safeIdentifier.property('d', token.arg)];
        }
        else {
            args = [];
        }
        switch (token.type) {
            case 'argument':
                return this.options.biDiSupport
                    ? biDiMarkText(String(args[0]), lc)
                    : String(args[0]);
            case 'select':
                fn = 'select';
                if (pluralToken && this.options.strict)
                    pluralToken = null;
                args.push(this.cases(token, pluralToken));
                this.setRuntimeFn('select');
                break;
            case 'selectordinal':
                fn = 'plural';
                args.push(token.pluralOffset || 0, id, this.cases(token, token), 1);
                this.setLocale(id, true);
                this.setRuntimeFn('plural');
                break;
            case 'plural':
                fn = 'plural';
                args.push(token.pluralOffset || 0, id, this.cases(token, token));
                this.setLocale(id, false);
                this.setRuntimeFn('plural');
                break;
            case 'function': {
                const formatter = this.options.customFormatters[token.key];
                const isModuleFn = formatter &&
                    'module' in formatter &&
                    typeof formatter.module === 'function';
                if (!formatter) {
                    if (token.key === 'date') {
                        fn = this.setDateFormatter(token, args, pluralToken);
                        break;
                    }
                    else if (token.key === 'number') {
                        fn = this.setNumberFormatter(token, args, pluralToken);
                        break;
                    }
                }
                args.push(JSON.stringify(this.plural.locale));
                if (token.param) {
                    if (pluralToken && this.options.strict)
                        pluralToken = null;
                    const arg = this.getFormatterArg(token, pluralToken);
                    if (arg)
                        args.push(arg);
                }
                fn = isModuleFn
                    ? safeIdentifier.identifier(`${token.key}__${this.plural.locale}`)
                    : token.key;
                this.setFormatter(fn, token.key);
                break;
            }
            case 'octothorpe':
                if (!pluralToken)
                    return '"#"';
                args = [
                    JSON.stringify(this.plural.locale),
                    safeIdentifier.property('d', pluralToken.arg),
                    pluralToken.pluralOffset || 0
                ];
                if (this.options.strict) {
                    fn = 'strictNumber';
                    args.push(JSON.stringify(pluralToken.arg));
                    this.setRuntimeFn('strictNumber');
                }
                else {
                    fn = 'number';
                    this.setRuntimeFn('number');
                }
                break;
        }
        if (!fn)
            throw new Error('Parser error for token ' + JSON.stringify(token));
        return `${fn}(${args.join(', ')})`;
    }
    runtimeIncludes(key, type) {
        if (safeIdentifier.identifier(key) !== key) {
            throw new SyntaxError(`Reserved word used as ${type} identifier: ${key}`);
        }
        const prev = this.runtime[key];
        if (!prev || prev.type === type)
            return prev;
        throw new TypeError(`Cannot override ${prev.type} runtime function as ${type}: ${key}`);
    }
    setLocale(key, ord) {
        const prev = this.runtimeIncludes(key, 'locale');
        const { getCardinal, getPlural, isDefault } = this.plural;
        let pf, module, toString;
        if (!ord && isDefault && getCardinal) {
            if (prev)
                return;
            pf = (n) => getCardinal(n);
            module = CARDINAL_MODULE;
            toString = () => String(getCardinal);
        }
        else {
            if (prev && (!isDefault || prev.module === PLURAL_MODULE))
                return;
            pf = (n, ord) => getPlural(n, ord);
            module = isDefault ? PLURAL_MODULE : getPlural.module || null;
            toString = () => String(getPlural);
        }
        this.runtime[key] = Object.assign(pf, {
            id: key,
            module,
            toString,
            type: 'locale'
        });
    }
    setRuntimeFn(key) {
        if (this.runtimeIncludes(key, 'runtime'))
            return;
        this.runtime[key] = Object.assign(Runtime__namespace[key], {
            id: key,
            module: RUNTIME_MODULE,
            type: 'runtime'
        });
    }
    getFormatterArg({ key, param }, pluralToken) {
        const fmt = this.options.customFormatters[key] ||
            (isFormatterKey(key) && Formatters__namespace[key]);
        if (!fmt || !param)
            return null;
        const argShape = ('arg' in fmt && fmt.arg) || 'string';
        if (argShape === 'options') {
            let value = '';
            for (const tok of param) {
                if (tok.type === 'content') {
                    value += tok.value;
                }
                else {
                    throw new SyntaxError(`Expected literal options for ${key} formatter`);
                }
            }
            const options = {};
            for (const pair of value.split(',')) {
                const keyEnd = pair.indexOf(':');
                if (keyEnd === -1) {
                    options[pair.trim()] = null;
                }
                else {
                    const k = pair.substring(0, keyEnd).trim();
                    const v = pair.substring(keyEnd + 1).trim();
                    if (v === 'true') {
                        options[k] = true;
                    }
                    else if (v === 'false') {
                        options[k] = false;
                    }
                    else if (v === 'null') {
                        options[k] = null;
                    }
                    else {
                        const n = Number(v);
                        options[k] = Number.isFinite(n) ? n : v;
                    }
                }
            }
            return JSON.stringify(options);
        }
        else {
            const parts = param.map(tok => this.token(tok, pluralToken));
            if (argShape === 'raw')
                return `[${parts.join(', ')}]`;
            const s = parts.join(' + ');
            return s ? `(${s}).trim()` : '""';
        }
    }
    setFormatter(key, parentKey) {
        if (this.runtimeIncludes(key, 'formatter'))
            return;
        const cf = this.options.customFormatters[parentKey || key];
        if (cf) {
            const cfo = typeof cf === 'function' ? { formatter: cf } : cf;
            this.runtime[key] = Object.assign(cfo.formatter.bind({}), Object.assign(Object.assign({}, cfo.formatter.prototype), { toString: () => String(cfo.formatter) }), { type: 'formatter' }, 'module' in cf && cf.module && cf.id
                ? {
                    id: safeIdentifier.identifier(cf.id),
                    module: typeof cf.module === 'function'
                        ? cf.module(this.plural.locale)
                        : cf.module
                }
                : { id: null, module: null });
        }
        else if (isFormatterKey(key)) {
            this.runtime[key] = Object.assign(Formatters__namespace[key], { type: 'formatter' }, { id: key, module: FORMATTER_MODULE });
        }
        else {
            throw new Error(`Formatting function not found: ${key}`);
        }
    }
    setDateFormatter({ param }, args, plural) {
        const { locale } = this.plural;
        const argStyle = param && param.length === 1 && param[0];
        if (argStyle &&
            argStyle.type === 'content' &&
            /^\s*::/.test(argStyle.value)) {
            const argSkeletonText = argStyle.value.trim().substr(2);
            const key = safeIdentifier.identifier(`date_${locale}_${argSkeletonText}`, true);
            if (!this.runtimeIncludes(key, 'formatter')) {
                const fmt = getDateFormatter(locale, argSkeletonText, this.options.timeZone);
                this.runtime[key] = Object.assign(fmt, {
                    id: key,
                    module: null,
                    toString: () => getDateFormatterSource(locale, argSkeletonText, this.options.timeZone),
                    type: 'formatter'
                });
            }
            return key;
        }
        args.push(JSON.stringify(locale));
        if (param && param.length > 0) {
            if (plural && this.options.strict)
                plural = null;
            const s = param.map(tok => this.token(tok, plural));
            args.push('(' + (s.join(' + ') || '""') + ').trim()');
        }
        this.setFormatter('date');
        return 'date';
    }
    setNumberFormatter({ param }, args, plural) {
        const { locale } = this.plural;
        if (!param || param.length === 0) {
            args.unshift(JSON.stringify(locale));
            args.push('0');
            this.setRuntimeFn('number');
            return 'number';
        }
        args.push(JSON.stringify(locale));
        if (param.length === 1 && param[0].type === 'content') {
            const fmtArg = param[0].value.trim();
            switch (fmtArg) {
                case 'currency':
                    args.push(JSON.stringify(this.options.currency));
                    this.setFormatter('numberCurrency');
                    return 'numberCurrency';
                case 'integer':
                    this.setFormatter('numberInteger');
                    return 'numberInteger';
                case 'percent':
                    this.setFormatter('numberPercent');
                    return 'numberPercent';
            }
            const cm = fmtArg.match(/^currency:([A-Z]+)$/);
            if (cm) {
                args.push(JSON.stringify(cm[1]));
                this.setFormatter('numberCurrency');
                return 'numberCurrency';
            }
            const key = safeIdentifier.identifier(`number_${locale}_${fmtArg}`, true);
            if (!this.runtimeIncludes(key, 'formatter')) {
                const { currency } = this.options;
                const fmt = getNumberFormatter(locale, fmtArg, currency);
                this.runtime[key] = Object.assign(fmt, {
                    id: null,
                    module: null,
                    toString: () => getNumberFormatterSource(locale, fmtArg, currency),
                    type: 'formatter'
                });
            }
            return key;
        }
        if (plural && this.options.strict)
            plural = null;
        const s = param.map(tok => this.token(tok, plural));
        args.push('(' + (s.join(' + ') || '""') + ').trim()');
        args.push(JSON.stringify(this.options.currency));
        this.setFormatter('numberFmt');
        return 'numberFmt';
    }
}
function isFormatterKey(key) {
    return key in Formatters__namespace;
}

module.exports = Compiler;
