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
export class DateFormatError extends Error {
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
export function getDateFormatOptions(tokens, timeZone, onError = error => {
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
