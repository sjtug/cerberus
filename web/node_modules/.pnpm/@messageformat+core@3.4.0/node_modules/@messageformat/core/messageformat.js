(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.MessageFormat = factory());
})(this, (function () { 'use strict';

    /******************************************************************************
    Copyright (c) Microsoft Corporation.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose with or without fee is hereby granted.

    THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
    REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
    AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
    INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
    LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
    OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
    PERFORMANCE OF THIS SOFTWARE.
    ***************************************************************************** */
    /* global Reflect, Promise, SuppressedError, Symbol */

    var __assign = function () {
      __assign = Object.assign || function __assign(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
          s = arguments[i];
          for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
      };
      return __assign.apply(this, arguments);
    };
    function __values(o) {
      var s = typeof Symbol === "function" && Symbol.iterator,
        m = s && o[s],
        i = 0;
      if (m) return m.call(o);
      if (o && typeof o.length === "number") return {
        next: function () {
          if (o && i >= o.length) o = void 0;
          return {
            value: o && o[i++],
            done: !o
          };
        }
      };
      throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
    }
    function __read(o, n) {
      var m = typeof Symbol === "function" && o[Symbol.iterator];
      if (!m) return o;
      var i = m.call(o),
        r,
        ar = [],
        e;
      try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
      } catch (error) {
        e = {
          error: error
        };
      } finally {
        try {
          if (r && !r.done && (m = i["return"])) m.call(i);
        } finally {
          if (e) throw e.error;
        }
      }
      return ar;
    }
    function __spreadArray(to, from, pack) {
      if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
          if (!ar) ar = Array.prototype.slice.call(from, 0, i);
          ar[i] = from[i];
        }
      }
      return to.concat(ar || Array.prototype.slice.call(from));
    }
    typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
      var e = new Error(message);
      return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
    };

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
    const alpha = width => width < 4 ? 'short' : width === 4 ? 'long' : 'narrow';
    const numeric = width => width % 2 === 0 ? '2-digit' : 'numeric';
    function yearOptions(token, onError) {
      switch (token.char) {
        case 'y':
          return {
            year: numeric(token.width)
          };
        case 'r':
          return {
            calendar: 'gregory',
            year: 'numeric'
          };
        case 'u':
        case 'U':
        case 'Y':
        default:
          onError(`${token.desc} is not supported; falling back to year:numeric`, DateFormatError.WARNING);
          return {
            year: 'numeric'
          };
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
      const {
        char,
        desc,
        width
      } = token;
      if (char === 'd') {
        return numeric(width);
      } else {
        onError(`${desc} is not supported`);
        return undefined;
      }
    }
    function weekdayStyle(token, onError) {
      const {
        char,
        desc,
        width
      } = token;
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
      return hourCycle ? {
        hour,
        hourCycle
      } : {
        hour
      };
    }
    function timeZoneNameStyle(token, onError) {
      // so much fallback behaviour here
      const {
        char,
        desc,
        width
      } = token;
      switch (char) {
        case 'v':
        case 'z':
          return width === 4 ? 'long' : 'short';
        case 'V':
          if (width === 4) return 'long';
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
          return {
            era: alpha(token.width)
          };
        case 'year':
          return yearOptions(token, onError);
        case 'month':
          return {
            month: monthStyle(token, onError)
          };
        case 'day':
          return {
            day: dayStyle(token, onError)
          };
        case 'weekday':
          return {
            weekday: weekdayStyle(token, onError)
          };
        case 'period':
          return undefined;
        case 'hour':
          return hourOptions(token);
        case 'min':
          return {
            minute: numeric(token.width)
          };
        case 'sec':
          return {
            second: numeric(token.width)
          };
        case 'tz':
          return {
            timeZoneName: timeZoneNameStyle(token, onError)
          };
        case 'quarter':
        case 'week':
        case 'sec-frac':
        case 'ms':
          onError(`${token.desc} is not supported`);
      }
      return undefined;
    }
    function getDateFormatOptions(tokens, timeZone) {
      let onError = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : error => {
        throw error;
      };
      const options = {
        timeZone
      };
      const fields = [];
      for (const token of tokens) {
        const {
          error,
          field,
          str
        } = token;
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
          if (fields.indexOf(field) === -1) fields.push(field);else onError(new DateFormatError(`Duplicate ${field} token`, token));
        }
        const opt = compileOptions(token, (msg, isWarning) => onError(new DateFormatError(msg, token, isWarning)));
        if (opt) Object.assign(options, opt);
      }
      return options;
    }

    const fields = {
      G: {
        field: 'era',
        desc: 'Era'
      },
      y: {
        field: 'year',
        desc: 'Year'
      },
      Y: {
        field: 'year',
        desc: 'Year of "Week of Year"'
      },
      u: {
        field: 'year',
        desc: 'Extended year'
      },
      U: {
        field: 'year',
        desc: 'Cyclic year name'
      },
      r: {
        field: 'year',
        desc: 'Related Gregorian year'
      },
      Q: {
        field: 'quarter',
        desc: 'Quarter'
      },
      q: {
        field: 'quarter',
        desc: 'Stand-alone quarter'
      },
      M: {
        field: 'month',
        desc: 'Month in year'
      },
      L: {
        field: 'month',
        desc: 'Stand-alone month in year'
      },
      w: {
        field: 'week',
        desc: 'Week of year'
      },
      W: {
        field: 'week',
        desc: 'Week of month'
      },
      d: {
        field: 'day',
        desc: 'Day in month'
      },
      D: {
        field: 'day',
        desc: 'Day of year'
      },
      F: {
        field: 'day',
        desc: 'Day of week in month'
      },
      g: {
        field: 'day',
        desc: 'Modified julian day'
      },
      E: {
        field: 'weekday',
        desc: 'Day of week'
      },
      e: {
        field: 'weekday',
        desc: 'Local day of week'
      },
      c: {
        field: 'weekday',
        desc: 'Stand-alone local day of week'
      },
      a: {
        field: 'period',
        desc: 'AM/PM marker'
      },
      b: {
        field: 'period',
        desc: 'AM/PM/noon/midnight marker'
      },
      B: {
        field: 'period',
        desc: 'Flexible day period'
      },
      h: {
        field: 'hour',
        desc: 'Hour in AM/PM (1~12)'
      },
      H: {
        field: 'hour',
        desc: 'Hour in day (0~23)'
      },
      k: {
        field: 'hour',
        desc: 'Hour in day (1~24)'
      },
      K: {
        field: 'hour',
        desc: 'Hour in AM/PM (0~11)'
      },
      j: {
        field: 'hour',
        desc: 'Hour in preferred cycle'
      },
      J: {
        field: 'hour',
        desc: 'Hour in preferred cycle without marker'
      },
      C: {
        field: 'hour',
        desc: 'Hour in preferred cycle with flexible marker'
      },
      m: {
        field: 'min',
        desc: 'Minute in hour'
      },
      s: {
        field: 'sec',
        desc: 'Second in minute'
      },
      S: {
        field: 'sec-frac',
        desc: 'Fractional second'
      },
      A: {
        field: 'ms',
        desc: 'Milliseconds in day'
      },
      z: {
        field: 'tz',
        desc: 'Time Zone: specific non-location'
      },
      Z: {
        field: 'tz',
        desc: 'Time Zone'
      },
      O: {
        field: 'tz',
        desc: 'Time Zone: localized'
      },
      v: {
        field: 'tz',
        desc: 'Time Zone: generic non-location'
      },
      V: {
        field: 'tz',
        desc: 'Time Zone: ID'
      },
      X: {
        field: 'tz',
        desc: 'Time Zone: ISO8601 with Z'
      },
      x: {
        field: 'tz',
        desc: 'Time Zone: ISO8601'
      }
    };
    const isLetter = char => char >= 'A' && char <= 'Z' || char >= 'a' && char <= 'z';
    function readFieldToken(src, pos) {
      const char = src[pos];
      let width = 1;
      while (src[++pos] === char) ++width;
      const field = fields[char];
      if (!field) {
        const msg = `The letter ${char} is not a valid field identifier`;
        return {
          char,
          error: new Error(msg),
          width
        };
      }
      return {
        char,
        field: field.field,
        desc: field.desc,
        width
      };
    }
    function readQuotedToken(src, pos) {
      let str = src[++pos];
      let width = 2;
      if (str === "'") return {
        char: "'",
        str,
        width
      };
      while (true) {
        const next = src[++pos];
        ++width;
        if (next === undefined) {
          const msg = `Unterminated quoted literal in pattern: ${str || src}`;
          return {
            char: "'",
            error: new Error(msg),
            str,
            width
          };
        } else if (next === "'") {
          if (src[++pos] !== "'") return {
            char: "'",
            str,
            width
          };else ++width;
        }
        str += next;
      }
    }
    function readToken(src, pos) {
      const char = src[pos];
      if (!char) return null;
      if (isLetter(char)) return readFieldToken(src, pos);
      if (char === "'") return readQuotedToken(src, pos);
      let str = char;
      let width = 1;
      while (true) {
        const next = src[++pos];
        if (!next || isLetter(next) || next === "'") return {
          char,
          str,
          width
        };
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
        if (!token) return tokens;
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
      if (typeof tokens === 'string') tokens = parseDateTokens(tokens);
      if (typeof timeZone === 'function') {
        onError = timeZone;
        timeZone = undefined;
      }
      const opt = getDateFormatOptions(tokens, timeZone, onError);
      const dtf = new Intl.DateTimeFormat(locales, opt);
      return date => dtf.format(date);
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
      if (typeof tokens === 'string') tokens = parseDateTokens(tokens);
      if (typeof timeZone === 'function') {
        onError = timeZone;
        timeZone = undefined;
      }
      const opt = getDateFormatOptions(tokens, timeZone, onError);
      const lines = [`(function() {`, `var opt = ${JSON.stringify(opt)};`, `var dtf = new Intl.DateTimeFormat(${JSON.stringify(locales)}, opt);`, `return function(value) { return dtf.format(value); }`];
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
    function getNumberFormatLocales(locales, _ref) {
      let {
        numberingSystem
      } = _ref;
      if (!Array.isArray(locales)) locales = [locales];
      return numberingSystem ? locales.map(lc => {
        const ext = lc.indexOf('-u-') === -1 ? 'u-nu' : 'nu';
        return `${lc}-${ext}-${numberingSystem}`;
      }).concat(locales) : locales;
    }

    // from https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/round
    function round(x, precision) {
      const y = +x + precision / 2;
      return y - y % +precision;
    }
    function getNumberFormatMultiplier(_ref) {
      let {
        scale,
        unit
      } = _ref;
      let mult = typeof scale === 'number' && scale >= 0 ? scale : 1;
      if (unit && unit.style === 'percent') mult *= 0.01;
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
      const {
        precision
      } = skeleton;
      if (precision && precision.style === 'precision-increment') {
        return n => round(n, precision.increment) * mult;
      } else {
        return n => n * mult;
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
      const {
        precision
      } = skeleton;
      if (precision && precision.style === 'precision-increment') {
        // see round() above for source
        const setX = `+n + ${precision.increment / 2}`;
        let res = `x - (x % +${precision.increment})`;
        if (mult !== 1) res = `(${res}) * ${mult}`;
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
      const {
        decimal,
        group,
        integerWidth,
        notation,
        precision,
        roundingMode,
        sign,
        unit,
        unitPer,
        unitWidth
      } = skeleton;
      const fail = (stem, source) => {
        if (onUnsupported) onUnsupported(new UnsupportedError(stem, source));
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
            if (unitPer) opt.unit += '-per-' + unitPer.replace(/.*-/, '');
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
          case 'precision-fraction':
            {
              const {
                minFraction: minF,
                maxFraction: maxF,
                minSignificant: minS,
                maxSignificant: maxS,
                source
              } = precision;
              if (typeof minF === 'number') {
                opt.minimumFractionDigits = minF;
                if (typeof minS === 'number') fail('precision-fraction', source);
              }
              if (typeof maxF === 'number') opt.maximumFractionDigits = maxF;
              if (typeof minS === 'number') opt.minimumSignificantDigits = minS;
              if (typeof maxS === 'number') opt.maximumSignificantDigits = maxS;
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
          case 'engineering':
            {
              const {
                expDigits,
                expSign,
                source,
                style
              } = notation;
              opt.notation = style;
              if (expDigits && expDigits > 1 || expSign && expSign !== 'sign-auto') {
                fail(style, source);
              }
              break;
            }
        }
      }
      if (integerWidth) {
        const {
          min,
          max,
          source
        } = integerWidth;
        if (min > 0) opt.minimumIntegerDigits = min;
        if (Number(max) > 0) {
          const hasExp = opt.notation === 'engineering' || opt.notation === 'scientific';
          if (max === 3 && hasExp) opt.notation = 'engineering';else fail('integer-width', source);
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
      if (decimal === 'decimal-always') fail(decimal);
      if (roundingMode) fail(roundingMode);
      return opt;
    }

    function parseAffixToken(src, pos, onError) {
      const char = src[pos];
      switch (char) {
        case '%':
          return {
            char: '%',
            style: 'percent',
            width: 1
          };
        case '‰':
          return {
            char: '%',
            style: 'permille',
            width: 1
          };
        case '¤':
          {
            let width = 1;
            while (src[++pos] === '¤') ++width;
            switch (width) {
              case 1:
                return {
                  char,
                  currency: 'default',
                  width
                };
              case 2:
                return {
                  char,
                  currency: 'iso-code',
                  width
                };
              case 3:
                return {
                  char,
                  currency: 'full-name',
                  width
                };
              case 5:
                return {
                  char,
                  currency: 'narrow',
                  width
                };
              default:
                {
                  const msg = `Invalid number (${width}) of ¤ chars in pattern`;
                  onError(new PatternError('¤', msg));
                  return null;
                }
            }
          }
        case '*':
          {
            const pad = src[pos + 1];
            if (pad) return {
              char,
              pad,
              width: 2
            };
            break;
          }
        case '+':
        case '-':
          return {
            char,
            width: 1
          };
        case "'":
          {
            let str = src[++pos];
            let width = 2;
            if (str === "'") return {
              char,
              str,
              width
            };
            while (true) {
              const next = src[++pos];
              ++width;
              if (next === undefined) {
                const msg = `Unterminated quoted literal in pattern: ${str}`;
                onError(new PatternError("'", msg));
                return {
                  char,
                  str,
                  width
                };
              } else if (next === "'") {
                if (src[++pos] !== "'") return {
                  char,
                  str,
                  width
                };else ++width;
              }
              str += next;
            }
          }
      }
      return null;
    }

    const isDigit = char => char >= '0' && char <= '9';
    function parseNumberToken(src, pos) {
      const char = src[pos];
      if (isDigit(char)) {
        let digits = char;
        while (true) {
          const next = src[++pos];
          if (isDigit(next)) digits += next;else return {
            char: '0',
            digits,
            width: digits.length
          };
        }
      }
      switch (char) {
        case '#':
          {
            let width = 1;
            while (src[++pos] === '#') ++width;
            return {
              char,
              width
            };
          }
        case '@':
          {
            let min = 1;
            while (src[++pos] === '@') ++min;
            let width = min;
            pos -= 1;
            while (src[++pos] === '#') ++width;
            return {
              char,
              min,
              width
            };
          }
        case 'E':
          {
            const plus = src[pos + 1] === '+';
            if (plus) ++pos;
            let expDigits = 0;
            while (src[++pos] === '0') ++expDigits;
            const width = (plus ? 2 : 1) + expDigits;
            if (expDigits) return {
              char,
              expDigits,
              plus,
              width
            };else break;
          }
        case '.':
        case ',':
          return {
            char,
            width: 1
          };
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
          case State.Prefix:
            {
              const token = parseAffixToken(src, pos, onError);
              if (token) {
                if (str) {
                  prefix.push({
                    char: "'",
                    str,
                    width: str.length
                  });
                  str = '';
                }
                prefix.push(token);
                pos += token.width;
              } else {
                const token = parseNumberToken(src, pos);
                if (token) {
                  if (str) {
                    prefix.push({
                      char: "'",
                      str,
                      width: str.length
                    });
                    str = '';
                  }
                  state = State.Number;
                  number.push(token);
                  pos += token.width;
                } else {
                  str += char;
                  pos += 1;
                }
              }
              break;
            }
          case State.Number:
            {
              const token = parseNumberToken(src, pos);
              if (token) {
                number.push(token);
                pos += token.width;
              } else {
                state = State.Suffix;
              }
              break;
            }
          case State.Suffix:
            {
              const token = parseAffixToken(src, pos, onError);
              if (token) {
                if (str) {
                  suffix.push({
                    char: "'",
                    str,
                    width: str.length
                  });
                  str = '';
                }
                suffix.push(token);
                pos += token.width;
              } else {
                str += char;
                pos += 1;
              }
              break;
            }
        }
      }
      if (str) suffix.push({
        char: "'",
        str,
        width: str.length
      });
      return {
        pattern: {
          prefix,
          number,
          suffix
        },
        pos
      };
    }
    function parseTokens(src, onError) {
      const {
        pattern,
        pos
      } = parseSubpattern(src, 0, onError);
      if (pos < src.length) {
        const {
          pattern: negative
        } = parseSubpattern(src, pos, onError);
        return {
          tokens: pattern,
          negative
        };
      }
      return {
        tokens: pattern
      };
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
          case '#':
            {
              if (decimalPos === -1) {
                if (intDigits) {
                  const msg = 'Pattern has # after integer digits';
                  onError(new PatternError('#', msg));
                }
                intOptional += token.width;
              } else {
                fracOptional += token.width;
              }
              break;
            }
          case '0':
            {
              if (decimalPos === -1) {
                intDigits += token.digits;
              } else {
                if (fracOptional) {
                  const msg = 'Pattern has digits after # in fraction';
                  onError(new PatternError('0', msg));
                }
                fracDigits += token.digits;
              }
              break;
            }
          case '@':
            {
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
          case 'E':
            {
              if (hasExponent) {
                onError(new MaskedValueError('exponent', res.notation));
              }
              if (hasGroups) {
                const msg = 'Exponential patterns may not contain grouping separators';
                onError(new PatternError('E', msg));
              }
              res.notation = {
                style: 'scientific'
              };
              if (token.expDigits > 1) res.notation.expDigits = token.expDigits;
              if (token.plus) res.notation.expSign = 'sign-always';
              hasExponent = true;
            }
        }
      }
      // imprecise mapping due to paradigm differences
      if (hasGroups) res.group = 'group-auto';else if (intOptional + intDigits.length > 3) res.group = 'group-off';
      const increment = Number(`${intDigits || '0'}.${fracDigits}`);
      if (increment) res.precision = {
        style: 'precision-increment',
        increment
      };
      if (!hasExponent) {
        if (intDigits.length > 1) res.integerWidth = {
          min: intDigits.length
        };
        if (!res.precision && (fracDigits.length || fracOptional)) {
          res.precision = {
            style: 'precision-fraction',
            minFraction: fracDigits.length,
            maxFraction: fracDigits.length + fracOptional
          };
        }
      } else {
        if (!res.precision || increment) {
          res.integerWidth = intOptional ? {
            min: 1,
            max: intOptional + intDigits.length
          } : {
            min: Math.max(1, intDigits.length)
          };
        }
        if (res.precision) {
          if (!increment) res.integerWidth = {
            min: 1,
            max: 1
          };
        } else {
          const dc = intDigits.length + fracDigits.length;
          if (decimalPos === -1) {
            if (dc > 0) {
              res.precision = {
                style: 'precision-fraction',
                maxSignificant: dc
              };
            }
          } else {
            res.precision = {
              style: 'precision-fraction',
              maxSignificant: Math.max(1, dc) + fracOptional
            };
            if (dc > 1) res.precision.minSignificant = dc;
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
            res.unit = {
              style: token.style
            };
            if (isPrefix) inFmt = true;else str = '';
            break;
          case '¤':
            if (!currency) {
              const msg = `The ¤ pattern requires a currency`;
              onError(new PatternError('¤', msg));
              break;
            }
            res.unit = {
              style: 'currency',
              currency
            };
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
            if (isPrefix) inFmt = true;else str = '';
            break;
          case '*':
            // TODO
            break;
          case '+':
            if (!inFmt) str += '+';
            break;
          case "'":
            if (!inFmt) str += token.str;
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
            if (isPrefix) inFmt = true;else str = '';
            break;
          case '-':
            if (!inFmt) str += '-';
            break;
          case "'":
            if (!inFmt) str += token.str;
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
    function parseNumberPattern(src, currency) {
      let onError = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : error => {
        throw error;
      };
      const {
        tokens,
        negative
      } = parseTokens(src, onError);
      const res = parseNumberAsSkeleton(tokens.number, onError);
      const prefix = handleAffix(tokens.prefix, res, currency, onError, true);
      const suffix = handleAffix(tokens.suffix, res, currency, onError, false);
      if (negative) {
        const negPrefix = getNegativeAffix(negative.prefix, true);
        const negSuffix = getNegativeAffix(negative.suffix, false);
        res.affix = {
          pos: [prefix, suffix],
          neg: [negPrefix, negSuffix]
        };
        res.sign = 'sign-never';
      } else if (prefix || suffix) {
        res.affix = {
          pos: [prefix, suffix]
        };
      }
      return res;
    }

    /** @internal */
    function isNumberingSystem(ns) {
      const systems = ['arab', 'arabext', 'bali', 'beng', 'deva', 'fullwide', 'gujr', 'guru', 'hanidec', 'khmr', 'knda', 'laoo', 'latn', 'limb', 'mlym', 'mong', 'mymr', 'orya', 'tamldec', 'telu', 'thai', 'tibt'];
      return systems.indexOf(ns) !== -1;
    }

    // FIXME: subtype is not checked
    /** @internal */
    function isUnit(unit) {
      const types = ['acceleration', 'angle', 'area', 'concentr', 'consumption', 'digital', 'duration', 'electric', 'energy', 'force', 'frequency', 'graphics', 'length', 'light', 'mass', 'power', 'pressure', 'speed', 'temperature', 'torque', 'volume'];
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
            for (const opt of options) onError(new BadOptionError(stem, opt));
          } else {
            onError(new TooManyOptionsError(stem, options, maxOpt));
          }
          return false;
        } else if (hasMinOption(stem) && options.length < minOptions[stem]) {
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
            return {
              min,
              max: min
            };
          case '+':
            return {
              min,
              max: null
            };
          case '#':
            {
              return {
                min,
                max: min + match[2].length
              };
            }
        }
      }
      return null;
    }
    function parsePrecisionBlueprint(stem, options, onError) {
      const fd = parseBlueprintDigits(stem, 'fraction');
      if (fd) {
        if (options.length > 1) onError(new TooManyOptionsError(stem, options, 1));
        const res = {
          style: 'precision-fraction',
          source: stem,
          minFraction: fd.min
        };
        if (fd.max != null) res.maxFraction = fd.max;
        const option = options[0];
        const sd = parseBlueprintDigits(option, 'significant');
        if (sd) {
          res.source = `${stem}/${option}`;
          res.minSignificant = sd.min;
          if (sd.max != null) res.maxSignificant = sd.max;
        } else if (option) {
          onError(new BadOptionError(stem, option));
        }
        return res;
      }
      const sd = parseBlueprintDigits(stem, 'significant');
      if (sd) {
        for (const opt of options) onError(new BadOptionError(stem, opt));
        const res = {
          style: 'precision-fraction',
          source: stem,
          minSignificant: sd.min
        };
        if (sd.max != null) res.maxSignificant = sd.max;
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
        if (prev) this.onError(new MaskedValueError(key, prev));
      }
      parseToken(stem, options) {
        if (!validOptions(stem, options, this.onError)) return;
        const option = options[0];
        const res = this.skeleton;
        switch (stem) {
          // notation
          case 'compact-short':
          case 'compact-long':
          case 'notation-simple':
            this.assertEmpty('notation');
            res.notation = {
              style: stem
            };
            break;
          case 'scientific':
          case 'engineering':
            {
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
                    } else {
                      this.badOption(stem, opt);
                    }
                }
              }
              this.assertEmpty('notation');
              const source = options.join('/');
              res.notation = expDigits && expSign ? {
                style: stem,
                source,
                expDigits,
                expSign
              } : expDigits ? {
                style: stem,
                source,
                expDigits
              } : expSign ? {
                style: stem,
                source,
                expSign
              } : {
                style: stem,
                source
              };
              break;
            }
          // unit
          case 'percent':
          case 'permille':
          case 'base-unit':
            this.assertEmpty('unit');
            res.unit = {
              style: stem
            };
            break;
          case 'currency':
            if (/^[A-Z]{3}$/.test(option)) {
              this.assertEmpty('unit');
              res.unit = {
                style: stem,
                currency: option
              };
            } else {
              this.badOption(stem, option);
            }
            break;
          case 'measure-unit':
            {
              if (isUnit(option)) {
                this.assertEmpty('unit');
                res.unit = {
                  style: stem,
                  unit: option
                };
              } else {
                this.badOption(stem, option);
              }
              break;
            }
          // unitPer
          case 'per-measure-unit':
            {
              if (isUnit(option)) {
                this.assertEmpty('unitPer');
                res.unitPer = option;
              } else {
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
            res.precision = {
              style: stem
            };
            break;
          case 'precision-currency-standard':
            this.assertEmpty('precision');
            if (option === 'w') {
              res.precision = {
                style: stem,
                trailingZero: 'stripIfInteger'
              };
            } else {
              res.precision = {
                style: stem
              };
            }
            break;
          case 'precision-increment':
            {
              const increment = Number(option);
              if (increment > 0) {
                this.assertEmpty('precision');
                res.precision = {
                  style: stem,
                  increment
                };
              } else {
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
          case 'integer-width':
            {
              if (/^\+0*$/.test(option)) {
                this.assertEmpty('integerWidth');
                res.integerWidth = {
                  source: option,
                  min: option.length - 1
                };
              } else {
                const m = option.match(/^#*(0*)$/);
                if (m) {
                  this.assertEmpty('integerWidth');
                  res.integerWidth = {
                    source: option,
                    min: m[1].length,
                    max: m[0].length
                  };
                } else {
                  this.badOption(stem, option);
                }
              }
              break;
            }
          // scale
          case 'scale':
            {
              const scale = Number(option);
              if (scale > 0) {
                this.assertEmpty('scale');
                res.scale = scale;
              } else {
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
          case 'numbering-system':
            {
              if (isNumberingSystem(option)) {
                this.assertEmpty('numberingSystem');
                res.numberingSystem = option;
              } else {
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
          default:
            {
              const precision = parsePrecisionBlueprint(stem, options, this.onError);
              if (precision) {
                this.assertEmpty('precision');
                res.precision = precision;
              } else {
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
    function parseNumberSkeleton(src) {
      let onError = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : error => {
        throw error;
      };
      const tokens = [];
      for (const part of src.split(' ')) {
        if (part) {
          const options = part.split('/');
          const stem = options.shift() || '';
          tokens.push({
            stem,
            options
          });
        }
      }
      const parser = new TokenParser(onError);
      for (const {
        stem,
        options
      } of tokens) {
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
        skeleton = skeleton.indexOf('::') === 0 ? parseNumberSkeleton(skeleton.slice(2), onError) : parseNumberPattern(skeleton, currency, onError);
      }
      const lc = getNumberFormatLocales(locales, skeleton);
      const opt = getNumberFormatOptions(skeleton, onError);
      const mod = getNumberFormatModifier(skeleton);
      const nf = new Intl.NumberFormat(lc, opt);
      if (skeleton.affix) {
        const [p0, p1] = skeleton.affix.pos;
        const [n0, n1] = skeleton.affix.neg || ['', ''];
        return value => {
          const n = nf.format(mod(value));
          return value < 0 ? `${n0}${n}${n1}` : `${p0}${n}${p1}`;
        };
      }
      return value => nf.format(mod(value));
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
        skeleton = skeleton.indexOf('::') === 0 ? parseNumberSkeleton(skeleton.slice(2), onError) : parseNumberPattern(skeleton, currency, onError);
      }
      const lc = getNumberFormatLocales(locales, skeleton);
      const opt = getNumberFormatOptions(skeleton, onError);
      const modSrc = getNumberFormatModifierSource(skeleton);
      const lines = [`(function() {`, `var opt = ${JSON.stringify(opt)};`, `var nf = new Intl.NumberFormat(${JSON.stringify(lc)}, opt);`];
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
        } else {
          res = `${p0} + ${res} + ${p1}`;
        }
      }
      lines.push(`return function(value) { return ${res}; }`);
      return lines.join('\n  ') + '\n})()';
    }

    var commonjsGlobal = typeof globalThis !== 'undefined' ? globalThis : typeof window !== 'undefined' ? window : typeof global !== 'undefined' ? global : typeof self !== 'undefined' ? self : {};

    function getDefaultExportFromCjs (x) {
    	return x && x.__esModule && Object.prototype.hasOwnProperty.call(x, 'default') ? x['default'] : x;
    }

    var parser = {};

    var lexer = {};

    var moo = {exports: {}};

    (function (module) {
      (function (root, factory) {
        if (module.exports) {
          module.exports = factory();
        } else {
          root.moo = factory();
        }
      })(commonjsGlobal, function () {

        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var toString = Object.prototype.toString;
        var hasSticky = typeof new RegExp().sticky === 'boolean';

        /***************************************************************************/

        function isRegExp(o) {
          return o && toString.call(o) === '[object RegExp]';
        }
        function isObject(o) {
          return o && typeof o === 'object' && !isRegExp(o) && !Array.isArray(o);
        }
        function reEscape(s) {
          return s.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
        }
        function reGroups(s) {
          var re = new RegExp('|' + s);
          return re.exec('').length - 1;
        }
        function reCapture(s) {
          return '(' + s + ')';
        }
        function reUnion(regexps) {
          if (!regexps.length) return '(?!)';
          var source = regexps.map(function (s) {
            return "(?:" + s + ")";
          }).join('|');
          return "(?:" + source + ")";
        }
        function regexpOrLiteral(obj) {
          if (typeof obj === 'string') {
            return '(?:' + reEscape(obj) + ')';
          } else if (isRegExp(obj)) {
            // TODO: consider /u support
            if (obj.ignoreCase) throw new Error('RegExp /i flag not allowed');
            if (obj.global) throw new Error('RegExp /g flag is implied');
            if (obj.sticky) throw new Error('RegExp /y flag is implied');
            if (obj.multiline) throw new Error('RegExp /m flag is implied');
            return obj.source;
          } else {
            throw new Error('Not a pattern: ' + obj);
          }
        }
        function pad(s, length) {
          if (s.length > length) {
            return s;
          }
          return Array(length - s.length + 1).join(" ") + s;
        }
        function lastNLines(string, numLines) {
          var position = string.length;
          var lineBreaks = 0;
          while (true) {
            var idx = string.lastIndexOf("\n", position - 1);
            if (idx === -1) {
              break;
            } else {
              lineBreaks++;
            }
            position = idx;
            if (lineBreaks === numLines) {
              break;
            }
            if (position === 0) {
              break;
            }
          }
          var startPosition = lineBreaks < numLines ? 0 : position + 1;
          return string.substring(startPosition).split("\n");
        }
        function objectToRules(object) {
          var keys = Object.getOwnPropertyNames(object);
          var result = [];
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var thing = object[key];
            var rules = [].concat(thing);
            if (key === 'include') {
              for (var j = 0; j < rules.length; j++) {
                result.push({
                  include: rules[j]
                });
              }
              continue;
            }
            var match = [];
            rules.forEach(function (rule) {
              if (isObject(rule)) {
                if (match.length) result.push(ruleOptions(key, match));
                result.push(ruleOptions(key, rule));
                match = [];
              } else {
                match.push(rule);
              }
            });
            if (match.length) result.push(ruleOptions(key, match));
          }
          return result;
        }
        function arrayToRules(array) {
          var result = [];
          for (var i = 0; i < array.length; i++) {
            var obj = array[i];
            if (obj.include) {
              var include = [].concat(obj.include);
              for (var j = 0; j < include.length; j++) {
                result.push({
                  include: include[j]
                });
              }
              continue;
            }
            if (!obj.type) {
              throw new Error('Rule has no type: ' + JSON.stringify(obj));
            }
            result.push(ruleOptions(obj.type, obj));
          }
          return result;
        }
        function ruleOptions(type, obj) {
          if (!isObject(obj)) {
            obj = {
              match: obj
            };
          }
          if (obj.include) {
            throw new Error('Matching rules cannot also include states');
          }

          // nb. error and fallback imply lineBreaks
          var options = {
            defaultType: type,
            lineBreaks: !!obj.error || !!obj.fallback,
            pop: false,
            next: null,
            push: null,
            error: false,
            fallback: false,
            value: null,
            type: null,
            shouldThrow: false
          };

          // Avoid Object.assign(), so we support IE9+
          for (var key in obj) {
            if (hasOwnProperty.call(obj, key)) {
              options[key] = obj[key];
            }
          }

          // type transform cannot be a string
          if (typeof options.type === 'string' && type !== options.type) {
            throw new Error("Type transform cannot be a string (type '" + options.type + "' for token '" + type + "')");
          }

          // convert to array
          var match = options.match;
          options.match = Array.isArray(match) ? match : match ? [match] : [];
          options.match.sort(function (a, b) {
            return isRegExp(a) && isRegExp(b) ? 0 : isRegExp(b) ? -1 : isRegExp(a) ? +1 : b.length - a.length;
          });
          return options;
        }
        function toRules(spec) {
          return Array.isArray(spec) ? arrayToRules(spec) : objectToRules(spec);
        }
        var defaultErrorRule = ruleOptions('error', {
          lineBreaks: true,
          shouldThrow: true
        });
        function compileRules(rules, hasStates) {
          var errorRule = null;
          var fast = Object.create(null);
          var fastAllowed = true;
          var unicodeFlag = null;
          var groups = [];
          var parts = [];

          // If there is a fallback rule, then disable fast matching
          for (var i = 0; i < rules.length; i++) {
            if (rules[i].fallback) {
              fastAllowed = false;
            }
          }
          for (var i = 0; i < rules.length; i++) {
            var options = rules[i];
            if (options.include) {
              // all valid inclusions are removed by states() preprocessor
              throw new Error('Inheritance is not allowed in stateless lexers');
            }
            if (options.error || options.fallback) {
              // errorRule can only be set once
              if (errorRule) {
                if (!options.fallback === !errorRule.fallback) {
                  throw new Error("Multiple " + (options.fallback ? "fallback" : "error") + " rules not allowed (for token '" + options.defaultType + "')");
                } else {
                  throw new Error("fallback and error are mutually exclusive (for token '" + options.defaultType + "')");
                }
              }
              errorRule = options;
            }
            var match = options.match.slice();
            if (fastAllowed) {
              while (match.length && typeof match[0] === 'string' && match[0].length === 1) {
                var word = match.shift();
                fast[word.charCodeAt(0)] = options;
              }
            }

            // Warn about inappropriate state-switching options
            if (options.pop || options.push || options.next) {
              if (!hasStates) {
                throw new Error("State-switching options are not allowed in stateless lexers (for token '" + options.defaultType + "')");
              }
              if (options.fallback) {
                throw new Error("State-switching options are not allowed on fallback tokens (for token '" + options.defaultType + "')");
              }
            }

            // Only rules with a .match are included in the RegExp
            if (match.length === 0) {
              continue;
            }
            fastAllowed = false;
            groups.push(options);

            // Check unicode flag is used everywhere or nowhere
            for (var j = 0; j < match.length; j++) {
              var obj = match[j];
              if (!isRegExp(obj)) {
                continue;
              }
              if (unicodeFlag === null) {
                unicodeFlag = obj.unicode;
              } else if (unicodeFlag !== obj.unicode && options.fallback === false) {
                throw new Error('If one rule is /u then all must be');
              }
            }

            // convert to RegExp
            var pat = reUnion(match.map(regexpOrLiteral));

            // validate
            var regexp = new RegExp(pat);
            if (regexp.test("")) {
              throw new Error("RegExp matches empty string: " + regexp);
            }
            var groupCount = reGroups(pat);
            if (groupCount > 0) {
              throw new Error("RegExp has capture groups: " + regexp + "\nUse (?: … ) instead");
            }

            // try and detect rules matching newlines
            if (!options.lineBreaks && regexp.test('\n')) {
              throw new Error('Rule should declare lineBreaks: ' + regexp);
            }

            // store regex
            parts.push(reCapture(pat));
          }

          // If there's no fallback rule, use the sticky flag so we only look for
          // matches at the current index.
          //
          // If we don't support the sticky flag, then fake it using an irrefutable
          // match (i.e. an empty pattern).
          var fallbackRule = errorRule && errorRule.fallback;
          var flags = hasSticky && !fallbackRule ? 'ym' : 'gm';
          var suffix = hasSticky || fallbackRule ? '' : '|';
          if (unicodeFlag === true) flags += "u";
          var combined = new RegExp(reUnion(parts) + suffix, flags);
          return {
            regexp: combined,
            groups: groups,
            fast: fast,
            error: errorRule || defaultErrorRule
          };
        }
        function compile(rules) {
          var result = compileRules(toRules(rules));
          return new Lexer({
            start: result
          }, 'start');
        }
        function checkStateGroup(g, name, map) {
          var state = g && (g.push || g.next);
          if (state && !map[state]) {
            throw new Error("Missing state '" + state + "' (in token '" + g.defaultType + "' of state '" + name + "')");
          }
          if (g && g.pop && +g.pop !== 1) {
            throw new Error("pop must be 1 (in token '" + g.defaultType + "' of state '" + name + "')");
          }
        }
        function compileStates(states, start) {
          var all = states.$all ? toRules(states.$all) : [];
          delete states.$all;
          var keys = Object.getOwnPropertyNames(states);
          if (!start) start = keys[0];
          var ruleMap = Object.create(null);
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            ruleMap[key] = toRules(states[key]).concat(all);
          }
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            var rules = ruleMap[key];
            var included = Object.create(null);
            for (var j = 0; j < rules.length; j++) {
              var rule = rules[j];
              if (!rule.include) continue;
              var splice = [j, 1];
              if (rule.include !== key && !included[rule.include]) {
                included[rule.include] = true;
                var newRules = ruleMap[rule.include];
                if (!newRules) {
                  throw new Error("Cannot include nonexistent state '" + rule.include + "' (in state '" + key + "')");
                }
                for (var k = 0; k < newRules.length; k++) {
                  var newRule = newRules[k];
                  if (rules.indexOf(newRule) !== -1) continue;
                  splice.push(newRule);
                }
              }
              rules.splice.apply(rules, splice);
              j--;
            }
          }
          var map = Object.create(null);
          for (var i = 0; i < keys.length; i++) {
            var key = keys[i];
            map[key] = compileRules(ruleMap[key], true);
          }
          for (var i = 0; i < keys.length; i++) {
            var name = keys[i];
            var state = map[name];
            var groups = state.groups;
            for (var j = 0; j < groups.length; j++) {
              checkStateGroup(groups[j], name, map);
            }
            var fastKeys = Object.getOwnPropertyNames(state.fast);
            for (var j = 0; j < fastKeys.length; j++) {
              checkStateGroup(state.fast[fastKeys[j]], name, map);
            }
          }
          return new Lexer(map, start);
        }
        function keywordTransform(map) {
          // Use a JavaScript Map to map keywords to their corresponding token type
          // unless Map is unsupported, then fall back to using an Object:
          var isMap = typeof Map !== 'undefined';
          var reverseMap = isMap ? new Map() : Object.create(null);
          var types = Object.getOwnPropertyNames(map);
          for (var i = 0; i < types.length; i++) {
            var tokenType = types[i];
            var item = map[tokenType];
            var keywordList = Array.isArray(item) ? item : [item];
            keywordList.forEach(function (keyword) {
              if (typeof keyword !== 'string') {
                throw new Error("keyword must be string (in keyword '" + tokenType + "')");
              }
              if (isMap) {
                reverseMap.set(keyword, tokenType);
              } else {
                reverseMap[keyword] = tokenType;
              }
            });
          }
          return function (k) {
            return isMap ? reverseMap.get(k) : reverseMap[k];
          };
        }

        /***************************************************************************/

        var Lexer = function (states, state) {
          this.startState = state;
          this.states = states;
          this.buffer = '';
          this.stack = [];
          this.reset();
        };
        Lexer.prototype.reset = function (data, info) {
          this.buffer = data || '';
          this.index = 0;
          this.line = info ? info.line : 1;
          this.col = info ? info.col : 1;
          this.queuedToken = info ? info.queuedToken : null;
          this.queuedText = info ? info.queuedText : "";
          this.queuedThrow = info ? info.queuedThrow : null;
          this.setState(info ? info.state : this.startState);
          this.stack = info && info.stack ? info.stack.slice() : [];
          return this;
        };
        Lexer.prototype.save = function () {
          return {
            line: this.line,
            col: this.col,
            state: this.state,
            stack: this.stack.slice(),
            queuedToken: this.queuedToken,
            queuedText: this.queuedText,
            queuedThrow: this.queuedThrow
          };
        };
        Lexer.prototype.setState = function (state) {
          if (!state || this.state === state) return;
          this.state = state;
          var info = this.states[state];
          this.groups = info.groups;
          this.error = info.error;
          this.re = info.regexp;
          this.fast = info.fast;
        };
        Lexer.prototype.popState = function () {
          this.setState(this.stack.pop());
        };
        Lexer.prototype.pushState = function (state) {
          this.stack.push(this.state);
          this.setState(state);
        };
        var eat = hasSticky ? function (re, buffer) {
          // assume re is /y
          return re.exec(buffer);
        } : function (re, buffer) {
          // assume re is /g
          var match = re.exec(buffer);
          // will always match, since we used the |(?:) trick
          if (match[0].length === 0) {
            return null;
          }
          return match;
        };
        Lexer.prototype._getGroup = function (match) {
          var groupCount = this.groups.length;
          for (var i = 0; i < groupCount; i++) {
            if (match[i + 1] !== undefined) {
              return this.groups[i];
            }
          }
          throw new Error('Cannot find token type for matched text');
        };
        function tokenToString() {
          return this.value;
        }
        Lexer.prototype.next = function () {
          var index = this.index;

          // If a fallback token matched, we don't need to re-run the RegExp
          if (this.queuedGroup) {
            var token = this._token(this.queuedGroup, this.queuedText, index);
            this.queuedGroup = null;
            this.queuedText = "";
            return token;
          }
          var buffer = this.buffer;
          if (index === buffer.length) {
            return; // EOF
          }

          // Fast matching for single characters
          var group = this.fast[buffer.charCodeAt(index)];
          if (group) {
            return this._token(group, buffer.charAt(index), index);
          }

          // Execute RegExp
          var re = this.re;
          re.lastIndex = index;
          var match = eat(re, buffer);

          // Error tokens match the remaining buffer
          var error = this.error;
          if (match == null) {
            return this._token(error, buffer.slice(index, buffer.length), index);
          }
          var group = this._getGroup(match);
          var text = match[0];
          if (error.fallback && match.index !== index) {
            this.queuedGroup = group;
            this.queuedText = text;

            // Fallback tokens contain the unmatched portion of the buffer
            return this._token(error, buffer.slice(index, match.index), index);
          }
          return this._token(group, text, index);
        };
        Lexer.prototype._token = function (group, text, offset) {
          // count line breaks
          var lineBreaks = 0;
          if (group.lineBreaks) {
            var matchNL = /\n/g;
            var nl = 1;
            if (text === '\n') {
              lineBreaks = 1;
            } else {
              while (matchNL.exec(text)) {
                lineBreaks++;
                nl = matchNL.lastIndex;
              }
            }
          }
          var token = {
            type: typeof group.type === 'function' && group.type(text) || group.defaultType,
            value: typeof group.value === 'function' ? group.value(text) : text,
            text: text,
            toString: tokenToString,
            offset: offset,
            lineBreaks: lineBreaks,
            line: this.line,
            col: this.col
          };
          // nb. adding more props to token object will make V8 sad!

          var size = text.length;
          this.index += size;
          this.line += lineBreaks;
          if (lineBreaks !== 0) {
            this.col = size - nl + 1;
          } else {
            this.col += size;
          }

          // throw, if no rule with {error: true}
          if (group.shouldThrow) {
            var err = new Error(this.formatError(token, "invalid syntax"));
            throw err;
          }
          if (group.pop) this.popState();else if (group.push) this.pushState(group.push);else if (group.next) this.setState(group.next);
          return token;
        };
        if (typeof Symbol !== 'undefined' && Symbol.iterator) {
          var LexerIterator = function (lexer) {
            this.lexer = lexer;
          };
          LexerIterator.prototype.next = function () {
            var token = this.lexer.next();
            return {
              value: token,
              done: !token
            };
          };
          LexerIterator.prototype[Symbol.iterator] = function () {
            return this;
          };
          Lexer.prototype[Symbol.iterator] = function () {
            return new LexerIterator(this);
          };
        }
        Lexer.prototype.formatError = function (token, message) {
          if (token == null) {
            // An undefined token indicates EOF
            var text = this.buffer.slice(this.index);
            var token = {
              text: text,
              offset: this.index,
              lineBreaks: text.indexOf('\n') === -1 ? 0 : 1,
              line: this.line,
              col: this.col
            };
          }
          var numLinesAround = 2;
          var firstDisplayedLine = Math.max(token.line - numLinesAround, 1);
          var lastDisplayedLine = token.line + numLinesAround;
          var lastLineDigits = String(lastDisplayedLine).length;
          var displayedLines = lastNLines(this.buffer, this.line - token.line + numLinesAround + 1).slice(0, 5);
          var errorLines = [];
          errorLines.push(message + " at line " + token.line + " col " + token.col + ":");
          errorLines.push("");
          for (var i = 0; i < displayedLines.length; i++) {
            var line = displayedLines[i];
            var lineNo = firstDisplayedLine + i;
            errorLines.push(pad(String(lineNo), lastLineDigits) + "  " + line);
            if (lineNo === token.line) {
              errorLines.push(pad("", lastLineDigits + token.col + 1) + "^");
            }
          }
          return errorLines.join("\n");
        };
        Lexer.prototype.clone = function () {
          return new Lexer(this.states, this.state);
        };
        Lexer.prototype.has = function (tokenType) {
          return true;
        };
        return {
          compile: compile,
          states: compileStates,
          error: Object.freeze({
            error: true
          }),
          fallback: Object.freeze({
            fallback: true
          }),
          keywords: keywordTransform
        };
      });
    })(moo);
    var mooExports = moo.exports;

    (function (exports) {

      var __importDefault = commonjsGlobal && commonjsGlobal.__importDefault || function (mod) {
        return mod && mod.__esModule ? mod : {
          "default": mod
        };
      };
      Object.defineProperty(exports, "__esModule", {
        value: true
      });
      exports.lexer = exports.states = void 0;
      const moo_1 = __importDefault(mooExports);
      exports.states = {
        body: {
          doubleapos: {
            match: "''",
            value: () => "'"
          },
          quoted: {
            lineBreaks: true,
            match: /'[{}#](?:[^]*?[^'])?'(?!')/u,
            value: src => src.slice(1, -1).replace(/''/g, "'")
          },
          argument: {
            lineBreaks: true,
            match: /\{\s*[^\p{Pat_Syn}\p{Pat_WS}]+\s*/u,
            push: 'arg',
            value: src => src.substring(1).trim()
          },
          octothorpe: '#',
          end: {
            match: '}',
            pop: 1
          },
          content: {
            lineBreaks: true,
            match: /[^][^{}#']*/u
          }
        },
        arg: {
          select: {
            lineBreaks: true,
            match: /,\s*(?:plural|select|selectordinal)\s*,\s*/u,
            next: 'select',
            value: src => src.split(',')[1].trim()
          },
          'func-args': {
            lineBreaks: true,
            match: /,\s*[^\p{Pat_Syn}\p{Pat_WS}]+\s*,/u,
            next: 'body',
            value: src => src.split(',')[1].trim()
          },
          'func-simple': {
            lineBreaks: true,
            match: /,\s*[^\p{Pat_Syn}\p{Pat_WS}]+\s*/u,
            value: src => src.substring(1).trim()
          },
          end: {
            match: '}',
            pop: 1
          }
        },
        select: {
          offset: {
            lineBreaks: true,
            match: /\s*offset\s*:\s*\d+\s*/u,
            value: src => src.split(':')[1].trim()
          },
          case: {
            lineBreaks: true,
            match: /\s*(?:=\d+|[^\p{Pat_Syn}\p{Pat_WS}]+)\s*\{/u,
            push: 'body',
            value: src => src.substring(0, src.indexOf('{')).trim()
          },
          end: {
            match: /\s*\}/u,
            pop: 1
          }
        }
      };
      exports.lexer = moo_1.default.states(exports.states);
    })(lexer);

    /**
     * An AST parser for ICU MessageFormat strings
     *
     * @packageDocumentation
     * @example
     * ```
     * import { parse } from '@messageformat/parser
     *
     * parse('So {wow}.')
     * [ { type: 'content', value: 'So ' },
     *   { type: 'argument', arg: 'wow' },
     *   { type: 'content', value: '.' } ]
     *
     *
     * parse('Such { thing }. { count, selectordinal, one {First} two {Second}' +
     *       '                  few {Third} other {#th} } word.')
     * [ { type: 'content', value: 'Such ' },
     *   { type: 'argument', arg: 'thing' },
     *   { type: 'content', value: '. ' },
     *   { type: 'selectordinal',
     *     arg: 'count',
     *     cases: [
     *       { key: 'one', tokens: [ { type: 'content', value: 'First' } ] },
     *       { key: 'two', tokens: [ { type: 'content', value: 'Second' } ] },
     *       { key: 'few', tokens: [ { type: 'content', value: 'Third' } ] },
     *       { key: 'other',
     *         tokens: [ { type: 'octothorpe' }, { type: 'content', value: 'th' } ] }
     *     ] },
     *   { type: 'content', value: ' word.' } ]
     *
     *
     * parse('Many{type,select,plural{ numbers}selectordinal{ counting}' +
     *                          'select{ choices}other{ some {type}}}.')
     * [ { type: 'content', value: 'Many' },
     *   { type: 'select',
     *     arg: 'type',
     *     cases: [
     *       { key: 'plural', tokens: [ { type: 'content', value: 'numbers' } ] },
     *       { key: 'selectordinal', tokens: [ { type: 'content', value: 'counting' } ] },
     *       { key: 'select', tokens: [ { type: 'content', value: 'choices' } ] },
     *       { key: 'other',
     *         tokens: [ { type: 'content', value: 'some ' }, { type: 'argument', arg: 'type' } ] }
     *     ] },
     *   { type: 'content', value: '.' } ]
     *
     *
     * parse('{Such compliance')
     * // ParseError: invalid syntax at line 1 col 7:
     * //
     * //  {Such compliance
     * //        ^
     *
     *
     * const msg = '{words, plural, zero{No words} one{One word} other{# words}}'
     * parse(msg)
     * [ { type: 'plural',
     *     arg: 'words',
     *     cases: [
     *       { key: 'zero', tokens: [ { type: 'content', value: 'No words' } ] },
     *       { key: 'one', tokens: [ { type: 'content', value: 'One word' } ] },
     *       { key: 'other',
     *         tokens: [ { type: 'octothorpe' }, { type: 'content', value: ' words' } ] }
     *     ] } ]
     *
     *
     * parse(msg, { cardinal: [ 'one', 'other' ], ordinal: [ 'one', 'two', 'few', 'other' ] })
     * // ParseError: The plural case zero is not valid in this locale at line 1 col 17:
     * //
     * //   {words, plural, zero{
     * //                   ^
     * ```
     */
    Object.defineProperty(parser, "__esModule", {
      value: true
    });
    var parse_1 = parser.parse = parser.ParseError = void 0;
    const lexer_js_1 = lexer;
    const getContext = lt => ({
      offset: lt.offset,
      line: lt.line,
      col: lt.col,
      text: lt.text,
      lineBreaks: lt.lineBreaks
    });
    const isSelectType = type => type === 'plural' || type === 'select' || type === 'selectordinal';
    function strictArgStyleParam(lt, param) {
      let value = '';
      let text = '';
      for (const p of param) {
        const pText = p.ctx.text;
        text += pText;
        switch (p.type) {
          case 'content':
            value += p.value;
            break;
          case 'argument':
          case 'function':
          case 'octothorpe':
            value += pText;
            break;
          default:
            throw new ParseError(lt, `Unsupported part in strict mode function arg style: ${pText}`);
        }
      }
      const c = {
        type: 'content',
        value: value.trim(),
        ctx: Object.assign({}, param[0].ctx, {
          text
        })
      };
      return [c];
    }
    const strictArgTypes = ['number', 'date', 'time', 'spellout', 'ordinal', 'duration'];
    const defaultPluralKeys = ['zero', 'one', 'two', 'few', 'many', 'other'];
    /**
     * Thrown by {@link parse} on error
     *
     * @public
     */
    class ParseError extends Error {
      /** @internal */
      constructor(lt, msg) {
        super(lexer_js_1.lexer.formatError(lt, msg));
      }
    }
    parser.ParseError = ParseError;
    class Parser {
      constructor(src, opt) {
        var _a, _b, _c, _d;
        this.lexer = lexer_js_1.lexer.reset(src);
        this.cardinalKeys = (_a = opt === null || opt === void 0 ? void 0 : opt.cardinal) !== null && _a !== void 0 ? _a : defaultPluralKeys;
        this.ordinalKeys = (_b = opt === null || opt === void 0 ? void 0 : opt.ordinal) !== null && _b !== void 0 ? _b : defaultPluralKeys;
        this.strict = (_c = opt === null || opt === void 0 ? void 0 : opt.strict) !== null && _c !== void 0 ? _c : false;
        this.strictPluralKeys = (_d = opt === null || opt === void 0 ? void 0 : opt.strictPluralKeys) !== null && _d !== void 0 ? _d : true;
      }
      parse() {
        return this.parseBody(false, true);
      }
      checkSelectKey(lt, type, key) {
        if (key[0] === '=') {
          if (type === 'select') {
            throw new ParseError(lt, `The case ${key} is not valid with select`);
          }
        } else if (type !== 'select') {
          const keys = type === 'plural' ? this.cardinalKeys : this.ordinalKeys;
          if (this.strictPluralKeys && keys.length > 0 && !keys.includes(key)) {
            const msg = `The ${type} case ${key} is not valid in this locale`;
            throw new ParseError(lt, msg);
          }
        }
      }
      parseSelect(_ref, inPlural, ctx, type) {
        let {
          value: arg
        } = _ref;
        const sel = {
          type,
          arg,
          cases: [],
          ctx
        };
        if (type === 'plural' || type === 'selectordinal') inPlural = true;else if (this.strict) inPlural = false;
        for (const lt of this.lexer) {
          switch (lt.type) {
            case 'offset':
              if (type === 'select') {
                throw new ParseError(lt, 'Unexpected plural offset for select');
              }
              if (sel.cases.length > 0) {
                throw new ParseError(lt, 'Plural offset must be set before cases');
              }
              sel.pluralOffset = Number(lt.value);
              ctx.text += lt.text;
              ctx.lineBreaks += lt.lineBreaks;
              break;
            case 'case':
              {
                this.checkSelectKey(lt, type, lt.value);
                sel.cases.push({
                  key: lt.value,
                  tokens: this.parseBody(inPlural),
                  ctx: getContext(lt)
                });
                break;
              }
            case 'end':
              return sel;
            /* istanbul ignore next: never happens */
            default:
              throw new ParseError(lt, `Unexpected lexer token: ${lt.type}`);
          }
        }
        throw new ParseError(null, 'Unexpected message end');
      }
      parseArgToken(lt, inPlural) {
        const ctx = getContext(lt);
        const argType = this.lexer.next();
        if (!argType) throw new ParseError(null, 'Unexpected message end');
        ctx.text += argType.text;
        ctx.lineBreaks += argType.lineBreaks;
        if (this.strict && (argType.type === 'func-simple' || argType.type === 'func-args') && !strictArgTypes.includes(argType.value)) {
          const msg = `Invalid strict mode function arg type: ${argType.value}`;
          throw new ParseError(lt, msg);
        }
        switch (argType.type) {
          case 'end':
            return {
              type: 'argument',
              arg: lt.value,
              ctx
            };
          case 'func-simple':
            {
              const end = this.lexer.next();
              if (!end) throw new ParseError(null, 'Unexpected message end');
              /* istanbul ignore if: never happens */
              if (end.type !== 'end') {
                throw new ParseError(end, `Unexpected lexer token: ${end.type}`);
              }
              ctx.text += end.text;
              if (isSelectType(argType.value.toLowerCase())) {
                throw new ParseError(argType, `Invalid type identifier: ${argType.value}`);
              }
              return {
                type: 'function',
                arg: lt.value,
                key: argType.value,
                ctx
              };
            }
          case 'func-args':
            {
              if (isSelectType(argType.value.toLowerCase())) {
                const msg = `Invalid type identifier: ${argType.value}`;
                throw new ParseError(argType, msg);
              }
              let param = this.parseBody(this.strict ? false : inPlural);
              if (this.strict && param.length > 0) {
                param = strictArgStyleParam(lt, param);
              }
              return {
                type: 'function',
                arg: lt.value,
                key: argType.value,
                param,
                ctx
              };
            }
          case 'select':
            /* istanbul ignore else: never happens */
            if (isSelectType(argType.value)) {
              return this.parseSelect(lt, inPlural, ctx, argType.value);
            } else {
              throw new ParseError(argType, `Unexpected select type ${argType.value}`);
            }
          /* istanbul ignore next: never happens */
          default:
            throw new ParseError(argType, `Unexpected lexer token: ${argType.type}`);
        }
      }
      parseBody(inPlural, atRoot) {
        const tokens = [];
        let content = null;
        for (const lt of this.lexer) {
          if (lt.type === 'argument') {
            if (content) content = null;
            tokens.push(this.parseArgToken(lt, inPlural));
          } else if (lt.type === 'octothorpe' && inPlural) {
            if (content) content = null;
            tokens.push({
              type: 'octothorpe',
              ctx: getContext(lt)
            });
          } else if (lt.type === 'end' && !atRoot) {
            return tokens;
          } else {
            let value = lt.value;
            if (!inPlural && lt.type === 'quoted' && value[0] === '#') {
              if (value.includes('{')) {
                const errMsg = `Unsupported escape pattern: ${value}`;
                throw new ParseError(lt, errMsg);
              }
              value = lt.text;
            }
            if (content) {
              content.value += value;
              content.ctx.text += lt.text;
              content.ctx.lineBreaks += lt.lineBreaks;
            } else {
              content = {
                type: 'content',
                value,
                ctx: getContext(lt)
              };
              tokens.push(content);
            }
          }
        }
        if (atRoot) return tokens;
        throw new ParseError(null, 'Unexpected message end');
      }
    }
    /**
     * Parse an input string into an array of tokens
     *
     * @public
     * @remarks
     * The parser only supports the default `DOUBLE_OPTIONAL`
     * {@link http://www.icu-project.org/apiref/icu4c/messagepattern_8h.html#af6e0757e0eb81c980b01ee5d68a9978b | apostrophe mode}.
     */
    function parse(src) {
      let options = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
      const parser = new Parser(src, options);
      return parser.parse();
    }
    parse_1 = parser.parse = parse;

    /**
     * A set of utility functions that are called by the compiled Javascript
     * functions, these are included locally in the output of {@link MessageFormat.compile compile()}.
     */
    /** @private */
    function _nf$1(lc) {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      return _nf$1[lc] || (_nf$1[lc] = new Intl.NumberFormat(lc));
    }
    /**
     * Utility function for `#` in plural rules
     *
     * @param lc The current locale
     * @param value The value to operate on
     * @param offset An offset, set by the surrounding context
     * @returns The result of applying the offset to the input value
     */
    function number(lc, value, offset) {
      return _nf$1(lc).format(value - offset);
    }
    /**
     * Strict utility function for `#` in plural rules
     *
     * Will throw an Error if `value` or `offset` are non-numeric.
     *
     * @param lc The current locale
     * @param value The value to operate on
     * @param offset An offset, set by the surrounding context
     * @param name The name of the argument, used for error reporting
     * @returns The result of applying the offset to the input value
     */
    function strictNumber(lc, value, offset, name) {
      var n = value - offset;
      if (isNaN(n)) throw new Error('`' + name + '` or its offset is not a number');
      return _nf$1(lc).format(n);
    }
    /**
     * Utility function for `{N, plural|selectordinal, ...}`
     *
     * @param value The key to use to find a pluralization rule
     * @param offset An offset to apply to `value`
     * @param lcfunc A locale function from `pluralFuncs`
     * @param data The object from which results are looked up
     * @param isOrdinal If true, use ordinal rather than cardinal rules
     * @returns The result of the pluralization
     */
    function plural(value, offset, lcfunc, data, isOrdinal) {
      if ({}.hasOwnProperty.call(data, value)) return data[value];
      if (offset) value -= offset;
      var key = lcfunc(value, isOrdinal);
      return key in data ? data[key] : data.other;
    }
    /**
     * Utility function for `{N, select, ...}`
     *
     * @param value The key to use to find a selection
     * @param data The object from which results are looked up
     * @returns The result of the select statement
     */
    function select(value, data) {
      return {}.hasOwnProperty.call(data, value) ? data[value] : data.other;
    }
    /**
     * Checks that all required arguments are set to defined values
     *
     * Throws on failure; otherwise returns undefined
     *
     * @param keys The required keys
     * @param data The data object being checked
     */
    function reqArgs(keys, data) {
      for (var i = 0; i < keys.length; ++i) {
        if (!data || data[keys[i]] === undefined) {
          throw new Error("Message requires argument '".concat(keys[i], "'"));
        }
      }
    }

    var Runtime = /*#__PURE__*/Object.freeze({
        __proto__: null,
        _nf: _nf$1,
        number: number,
        plural: plural,
        reqArgs: reqArgs,
        select: select,
        strictNumber: strictNumber
    });

    /**
     * Represent a date as a short/default/long/full string
     *
     * @param value Either a Unix epoch time in milliseconds, or a string value
     *   representing a date. Parsed with `new Date(value)`
     *
     * @example
     * ```js
     * var mf = new MessageFormat(['en', 'fi']);
     *
     * mf.compile('Today is {T, date}')({ T: Date.now() })
     * // 'Today is Feb 21, 2016'
     *
     * mf.compile('Tänään on {T, date}', 'fi')({ T: Date.now() })
     * // 'Tänään on 21. helmikuuta 2016'
     *
     * mf.compile('Unix time started on {T, date, full}')({ T: 0 })
     * // 'Unix time started on Thursday, January 1, 1970'
     *
     * var cf = mf.compile('{sys} became operational on {d0, date, short}');
     * cf({ sys: 'HAL 9000', d0: '12 January 1999' })
     * // 'HAL 9000 became operational on 1/12/1999'
     * ```
     */
    function date(value, lc, size) {
      var o = {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      };
      /* eslint-disable no-fallthrough */
      switch (size) {
        case 'full':
          o.weekday = 'long';
        case 'long':
          o.month = 'long';
          break;
        case 'short':
          o.month = 'numeric';
      }
      return new Date(value).toLocaleDateString(lc, o);
    }

    /**
     * Represent a duration in seconds as a string
     *
     * @param value A finite number, or its string representation
     * @return Includes one or two `:` separators, and matches the pattern
     *   `hhhh:mm:ss`, possibly with a leading `-` for negative values and a
     *   trailing `.sss` part for non-integer input
     *
     * @example
     * ```js
     * var mf = new MessageFormat();
     *
     * mf.compile('It has been {D, duration}')({ D: 123 })
     * // 'It has been 2:03'
     *
     * mf.compile('Countdown: {D, duration}')({ D: -151200.42 })
     * // 'Countdown: -42:00:00.420'
     * ```
     */
    function duration(value) {
      if (typeof value !== 'number') value = Number(value);
      if (!isFinite(value)) return String(value);
      var sign = '';
      if (value < 0) {
        sign = '-';
        value = Math.abs(value);
      } else {
        value = Number(value);
      }
      var sec = value % 60;
      var parts = [Math.round(sec) === sec ? sec : sec.toFixed(3)];
      if (value < 60) {
        parts.unshift(0); // at least one : is required
      } else {
        value = Math.round((value - Number(parts[0])) / 60);
        parts.unshift(value % 60); // minutes
        if (value >= 60) {
          value = Math.round((value - Number(parts[0])) / 60);
          parts.unshift(value); // hours
        }
      }
      var first = parts.shift();
      return sign + first + ':' + parts.map(function (n) {
        return Number(n) < 10 ? '0' + String(n) : String(n);
      }).join(':');
    }

    /**
     * Represent a number as an integer, percent or currency value
     *
     * Available in MessageFormat strings as `{VAR, number, integer|percent|currency}`.
     * Internally, calls Intl.NumberFormat with appropriate parameters. `currency` will
     * default to USD; to change, set `MessageFormat#currency` to the appropriate
     * three-letter currency code, or use the `currency:EUR` form of the argument.
     *
     * @example
     * ```js
     * var mf = new MessageFormat('en', { currency: 'EUR'});
     *
     * mf.compile('{N} is almost {N, number, integer}')({ N: 3.14 })
     * // '3.14 is almost 3'
     *
     * mf.compile('{P, number, percent} complete')({ P: 0.99 })
     * // '99% complete'
     *
     * mf.compile('The total is {V, number, currency}.')({ V: 5.5 })
     * // 'The total is €5.50.'
     *
     * mf.compile('The total is {V, number, currency:GBP}.')({ V: 5.5 })
     * // 'The total is £5.50.'
     * ```
     */
    var _nf = {};
    function nf(lc, opt) {
      var key = String(lc) + JSON.stringify(opt);
      if (!_nf[key]) _nf[key] = new Intl.NumberFormat(lc, opt);
      return _nf[key];
    }
    function numberFmt(value, lc, arg, defaultCurrency) {
      var _a = arg && arg.split(':') || [],
        type = _a[0],
        currency = _a[1];
      var opt = {
        integer: {
          maximumFractionDigits: 0
        },
        percent: {
          style: 'percent'
        },
        currency: {
          style: 'currency',
          currency: currency && currency.trim() || defaultCurrency,
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }
      };
      return nf(lc, opt[type] || {}).format(value);
    }
    var numberCurrency = function (value, lc, arg) {
      return nf(lc, {
        style: 'currency',
        currency: arg,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(value);
    };
    var numberInteger = function (value, lc) {
      return nf(lc, {
        maximumFractionDigits: 0
      }).format(value);
    };
    var numberPercent = function (value, lc) {
      return nf(lc, {
        style: 'percent'
      }).format(value);
    };

    /**
     * Represent a time as a short/default/long string
     *
     * @param value Either a Unix epoch time in milliseconds, or a string value
     *   representing a date. Parsed with `new Date(value)`
     *
     * @example
     * ```js
     * var mf = new MessageFormat(['en', 'fi']);
     *
     * mf.compile('The time is now {T, time}')({ T: Date.now() })
     * // 'The time is now 11:26:35 PM'
     *
     * mf.compile('Kello on nyt {T, time}', 'fi')({ T: Date.now() })
     * // 'Kello on nyt 23.26.35'
     *
     * var cf = mf.compile('The Eagle landed at {T, time, full} on {T, date, full}');
     * cf({ T: '1969-07-20 20:17:40 UTC' })
     * // 'The Eagle landed at 10:17:40 PM GMT+2 on Sunday, July 20, 1969'
     * ```
     */
    function time(value, lc, size) {
      var o = {
        second: 'numeric',
        minute: 'numeric',
        hour: 'numeric'
      };
      /* eslint-disable no-fallthrough */
      switch (size) {
        case 'full':
        case 'long':
          o.timeZoneName = 'short';
          break;
        case 'short':
          delete o.second;
      }
      return new Date(value).toLocaleTimeString(lc, o);
    }

    var Formatters = /*#__PURE__*/Object.freeze({
        __proto__: null,
        date: date,
        duration: duration,
        numberCurrency: numberCurrency,
        numberFmt: numberFmt,
        numberInteger: numberInteger,
        numberPercent: numberPercent,
        time: time
    });

    const ES3 = {
      break: true,
      continue: true,
      delete: true,
      else: true,
      for: true,
      function: true,
      if: true,
      in: true,
      new: true,
      return: true,
      this: true,
      typeof: true,
      var: true,
      void: true,
      while: true,
      with: true,
      case: true,
      catch: true,
      default: true,
      do: true,
      finally: true,
      instanceof: true,
      switch: true,
      throw: true,
      try: true
    };
    const ESnext = {
      // in addition to reservedES3
      await: true,
      debugger: true,
      class: true,
      enum: true,
      extends: true,
      super: true,
      const: true,
      export: true,
      import: true,
      null: true,
      true: true,
      false: true,
      implements: true,
      let: true,
      private: true,
      public: true,
      yield: true,
      interface: true,
      package: true,
      protected: true,
      static: true
    };
    var reserved = {
      ES3,
      ESnext
    };
    var reserved$1 = /*@__PURE__*/getDefaultExportFromCjs(reserved);

    // from https://werxltd.com/wp/2010/05/13/javascript-implementation-of-javas-string-hashcode-method/
    function hashCode(str) {
      let hash = 0;
      for (let i = 0; i < str.length; ++i) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash |= 0; // Convert to 32bit integer
      }
      return hash;
    }
    function identifier(key, unique) {
      if (unique) key += ' ' + hashCode(key).toString(36);
      const id = key.trim().replace(/\W+/g, '_');
      return reserved$1.ES3[id] || reserved$1.ESnext[id] || /^\d/.test(id) ? '_' + id : id;
    }
    function property(obj, key) {
      if (/^[A-Z_$][0-9A-Z_$]*$/i.test(key) && !reserved$1.ES3[key]) {
        return obj ? obj + '.' + key : key;
      } else {
        const jkey = JSON.stringify(key);
        return obj ? obj + '[' + jkey + ']' : jkey;
      }
    }

    var rtlLanguages = [
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
    var rtlRegExp = new RegExp('^' + rtlLanguages.join('|^'));
    function biDiMarkText(text, locale) {
        var isLocaleRTL = rtlRegExp.test(locale);
        var mark = JSON.stringify(isLocaleRTL ? '\u200F' : '\u200E');
        return "".concat(mark, " + ").concat(text, " + ").concat(mark);
    }

    var RUNTIME_MODULE = '@messageformat/runtime';
    var CARDINAL_MODULE = '@messageformat/runtime/lib/cardinals';
    var PLURAL_MODULE = '@messageformat/runtime/lib/plurals';
    var FORMATTER_MODULE = '@messageformat/runtime/lib/formatters';
    var Compiler = (function () {
        function Compiler(options) {
            this.arguments = [];
            this.runtime = {};
            this.options = options;
        }
        Compiler.prototype.compile = function (src, plural, plurals) {
            var e_1, _a;
            var _this = this;
            var _b = this.options, localeCodeFromKey = _b.localeCodeFromKey, requireAllArguments = _b.requireAllArguments, strict = _b.strict, strictPluralKeys = _b.strictPluralKeys;
            if (typeof src === 'object') {
                var result = {};
                try {
                    for (var _c = __values(Object.keys(src)), _d = _c.next(); !_d.done; _d = _c.next()) {
                        var key = _d.value;
                        var lc = localeCodeFromKey ? localeCodeFromKey(key) : key;
                        var pl = (plurals && lc && plurals[lc]) || plural;
                        result[key] = this.compile(src[key], pl, plurals);
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (_d && !_d.done && (_a = _c.return)) _a.call(_c);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
                return result;
            }
            this.plural = plural;
            var parserOptions = {
                cardinal: plural.cardinals,
                ordinal: plural.ordinals,
                strict: strict,
                strictPluralKeys: strictPluralKeys
            };
            this.arguments = [];
            var r = parse_1(src, parserOptions).map(function (token) { return _this.token(token, null); });
            var hasArgs = this.arguments.length > 0;
            var res = this.concatenate(r, true);
            if (requireAllArguments && hasArgs) {
                this.setRuntimeFn('reqArgs');
                var reqArgs = JSON.stringify(this.arguments);
                return "(d) => { reqArgs(".concat(reqArgs, ", d); return ").concat(res, "; }");
            }
            return "(".concat(hasArgs ? 'd' : '', ") => ").concat(res);
        };
        Compiler.prototype.cases = function (token, pluralToken) {
            var _this = this;
            var needOther = true;
            var r = token.cases.map(function (_a) {
                var key = _a.key, tokens = _a.tokens;
                if (key === 'other')
                    needOther = false;
                var s = tokens.map(function (tok) { return _this.token(tok, pluralToken); });
                return "".concat(property(null, key.replace(/^=/, '')), ": ").concat(_this.concatenate(s, false));
            });
            if (needOther) {
                var type = token.type;
                var _a = this.plural, cardinals = _a.cardinals, ordinals = _a.ordinals;
                if (type === 'select' ||
                    (type === 'plural' && cardinals.includes('other')) ||
                    (type === 'selectordinal' && ordinals.includes('other'))) {
                    throw new Error("No 'other' form found in ".concat(JSON.stringify(token)));
                }
            }
            return "{ ".concat(r.join(', '), " }");
        };
        Compiler.prototype.concatenate = function (tokens, root) {
            var asValues = this.options.returnType === 'values';
            return asValues && (root || tokens.length > 1)
                ? '[' + tokens.join(', ') + ']'
                : tokens.join(' + ') || '""';
        };
        Compiler.prototype.token = function (token, pluralToken) {
            if (token.type === 'content')
                return JSON.stringify(token.value);
            var _a = this.plural, id = _a.id, lc = _a.lc;
            var args, fn;
            if ('arg' in token) {
                this.arguments.push(token.arg);
                args = [property('d', token.arg)];
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
                    var formatter = this.options.customFormatters[token.key];
                    var isModuleFn = formatter &&
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
                        var arg = this.getFormatterArg(token, pluralToken);
                        if (arg)
                            args.push(arg);
                    }
                    fn = isModuleFn
                        ? identifier("".concat(token.key, "__").concat(this.plural.locale))
                        : token.key;
                    this.setFormatter(fn, token.key);
                    break;
                }
                case 'octothorpe':
                    if (!pluralToken)
                        return '"#"';
                    args = [
                        JSON.stringify(this.plural.locale),
                        property('d', pluralToken.arg),
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
            return "".concat(fn, "(").concat(args.join(', '), ")");
        };
        Compiler.prototype.runtimeIncludes = function (key, type) {
            if (identifier(key) !== key) {
                throw new SyntaxError("Reserved word used as ".concat(type, " identifier: ").concat(key));
            }
            var prev = this.runtime[key];
            if (!prev || prev.type === type)
                return prev;
            throw new TypeError("Cannot override ".concat(prev.type, " runtime function as ").concat(type, ": ").concat(key));
        };
        Compiler.prototype.setLocale = function (key, ord) {
            var prev = this.runtimeIncludes(key, 'locale');
            var _a = this.plural, getCardinal = _a.getCardinal, getPlural = _a.getPlural, isDefault = _a.isDefault;
            var pf, module, toString;
            if (!ord && isDefault && getCardinal) {
                if (prev)
                    return;
                pf = function (n) { return getCardinal(n); };
                module = CARDINAL_MODULE;
                toString = function () { return String(getCardinal); };
            }
            else {
                if (prev && (!isDefault || prev.module === PLURAL_MODULE))
                    return;
                pf = function (n, ord) { return getPlural(n, ord); };
                module = isDefault ? PLURAL_MODULE : getPlural.module || null;
                toString = function () { return String(getPlural); };
            }
            this.runtime[key] = Object.assign(pf, {
                id: key,
                module: module,
                toString: toString,
                type: 'locale'
            });
        };
        Compiler.prototype.setRuntimeFn = function (key) {
            if (this.runtimeIncludes(key, 'runtime'))
                return;
            this.runtime[key] = Object.assign(Runtime[key], {
                id: key,
                module: RUNTIME_MODULE,
                type: 'runtime'
            });
        };
        Compiler.prototype.getFormatterArg = function (_a, pluralToken) {
            var e_2, _b, e_3, _c;
            var _this = this;
            var key = _a.key, param = _a.param;
            var fmt = this.options.customFormatters[key] ||
                (isFormatterKey(key) && Formatters[key]);
            if (!fmt || !param)
                return null;
            var argShape = ('arg' in fmt && fmt.arg) || 'string';
            if (argShape === 'options') {
                var value = '';
                try {
                    for (var param_1 = __values(param), param_1_1 = param_1.next(); !param_1_1.done; param_1_1 = param_1.next()) {
                        var tok = param_1_1.value;
                        if (tok.type === 'content') {
                            value += tok.value;
                        }
                        else {
                            throw new SyntaxError("Expected literal options for ".concat(key, " formatter"));
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (param_1_1 && !param_1_1.done && (_b = param_1.return)) _b.call(param_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                var options = {};
                try {
                    for (var _d = __values(value.split(',')), _e = _d.next(); !_e.done; _e = _d.next()) {
                        var pair = _e.value;
                        var keyEnd = pair.indexOf(':');
                        if (keyEnd === -1) {
                            options[pair.trim()] = null;
                        }
                        else {
                            var k = pair.substring(0, keyEnd).trim();
                            var v = pair.substring(keyEnd + 1).trim();
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
                                var n = Number(v);
                                options[k] = Number.isFinite(n) ? n : v;
                            }
                        }
                    }
                }
                catch (e_3_1) { e_3 = { error: e_3_1 }; }
                finally {
                    try {
                        if (_e && !_e.done && (_c = _d.return)) _c.call(_d);
                    }
                    finally { if (e_3) throw e_3.error; }
                }
                return JSON.stringify(options);
            }
            else {
                var parts = param.map(function (tok) { return _this.token(tok, pluralToken); });
                if (argShape === 'raw')
                    return "[".concat(parts.join(', '), "]");
                var s = parts.join(' + ');
                return s ? "(".concat(s, ").trim()") : '""';
            }
        };
        Compiler.prototype.setFormatter = function (key, parentKey) {
            if (this.runtimeIncludes(key, 'formatter'))
                return;
            var cf = this.options.customFormatters[parentKey || key];
            if (cf) {
                var cfo_1 = typeof cf === 'function' ? { formatter: cf } : cf;
                this.runtime[key] = Object.assign(cfo_1.formatter.bind({}), __assign(__assign({}, cfo_1.formatter.prototype), { toString: function () { return String(cfo_1.formatter); } }), { type: 'formatter' }, 'module' in cf && cf.module && cf.id
                    ? {
                        id: identifier(cf.id),
                        module: typeof cf.module === 'function'
                            ? cf.module(this.plural.locale)
                            : cf.module
                    }
                    : { id: null, module: null });
            }
            else if (isFormatterKey(key)) {
                this.runtime[key] = Object.assign(Formatters[key], { type: 'formatter' }, { id: key, module: FORMATTER_MODULE });
            }
            else {
                throw new Error("Formatting function not found: ".concat(key));
            }
        };
        Compiler.prototype.setDateFormatter = function (_a, args, plural) {
            var _this = this;
            var param = _a.param;
            var locale = this.plural.locale;
            var argStyle = param && param.length === 1 && param[0];
            if (argStyle &&
                argStyle.type === 'content' &&
                /^\s*::/.test(argStyle.value)) {
                var argSkeletonText_1 = argStyle.value.trim().substr(2);
                var key = identifier("date_".concat(locale, "_").concat(argSkeletonText_1), true);
                if (!this.runtimeIncludes(key, 'formatter')) {
                    var fmt = getDateFormatter(locale, argSkeletonText_1, this.options.timeZone);
                    this.runtime[key] = Object.assign(fmt, {
                        id: key,
                        module: null,
                        toString: function () {
                            return getDateFormatterSource(locale, argSkeletonText_1, _this.options.timeZone);
                        },
                        type: 'formatter'
                    });
                }
                return key;
            }
            args.push(JSON.stringify(locale));
            if (param && param.length > 0) {
                if (plural && this.options.strict)
                    plural = null;
                var s = param.map(function (tok) { return _this.token(tok, plural); });
                args.push('(' + (s.join(' + ') || '""') + ').trim()');
            }
            this.setFormatter('date');
            return 'date';
        };
        Compiler.prototype.setNumberFormatter = function (_a, args, plural) {
            var _this = this;
            var param = _a.param;
            var locale = this.plural.locale;
            if (!param || param.length === 0) {
                args.unshift(JSON.stringify(locale));
                args.push('0');
                this.setRuntimeFn('number');
                return 'number';
            }
            args.push(JSON.stringify(locale));
            if (param.length === 1 && param[0].type === 'content') {
                var fmtArg_1 = param[0].value.trim();
                switch (fmtArg_1) {
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
                var cm = fmtArg_1.match(/^currency:([A-Z]+)$/);
                if (cm) {
                    args.push(JSON.stringify(cm[1]));
                    this.setFormatter('numberCurrency');
                    return 'numberCurrency';
                }
                var key = identifier("number_".concat(locale, "_").concat(fmtArg_1), true);
                if (!this.runtimeIncludes(key, 'formatter')) {
                    var currency_1 = this.options.currency;
                    var fmt = getNumberFormatter(locale, fmtArg_1, currency_1);
                    this.runtime[key] = Object.assign(fmt, {
                        id: null,
                        module: null,
                        toString: function () { return getNumberFormatterSource(locale, fmtArg_1, currency_1); },
                        type: 'formatter'
                    });
                }
                return key;
            }
            if (plural && this.options.strict)
                plural = null;
            var s = param.map(function (tok) { return _this.token(tok, plural); });
            args.push('(' + (s.join(' + ') || '""') + ').trim()');
            args.push(JSON.stringify(this.options.currency));
            this.setFormatter('numberFmt');
            return 'numberFmt';
        };
        return Compiler;
    }());
    function isFormatterKey(key) {
        return key in Formatters;
    }

    const a$2 = n => n == 1 ? 'one' : 'other';
    const b$2 = n => n == 0 || n == 1 ? 'one' : 'other';
    const c$2 = n => n >= 0 && n <= 1 ? 'one' : 'other';
    const d$2 = n => {
      const s = String(n).split('.'),
        v0 = !s[1];
      return n == 1 && v0 ? 'one' : 'other';
    };
    const e$1 = n => 'other';
    const f$2 = n => n == 1 ? 'one' : n == 2 ? 'two' : 'other';
    const af$2 = a$2;
    const ak$2 = b$2;
    const am$2 = c$2;
    const an$2 = a$2;
    const ar$2 = n => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n100 = t0 && s[0].slice(-2);
      return n == 0 ? 'zero' : n == 1 ? 'one' : n == 2 ? 'two' : n100 >= 3 && n100 <= 10 ? 'few' : n100 >= 11 && n100 <= 99 ? 'many' : 'other';
    };
    const ars$2 = n => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n100 = t0 && s[0].slice(-2);
      return n == 0 ? 'zero' : n == 1 ? 'one' : n == 2 ? 'two' : n100 >= 3 && n100 <= 10 ? 'few' : n100 >= 11 && n100 <= 99 ? 'many' : 'other';
    };
    const as$2 = c$2;
    const asa$2 = a$2;
    const ast$2 = d$2;
    const az$2 = a$2;
    const bal$2 = a$2;
    const be$2 = n => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2);
      return n10 == 1 && n100 != 11 ? 'one' : n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? 'few' : t0 && n10 == 0 || n10 >= 5 && n10 <= 9 || n100 >= 11 && n100 <= 14 ? 'many' : 'other';
    };
    const bem$2 = a$2;
    const bez$2 = a$2;
    const bg$2 = a$2;
    const bho$2 = b$2;
    const bm$2 = e$1;
    const bn$2 = c$2;
    const bo$2 = e$1;
    const br$2 = n => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2),
        n1000000 = t0 && s[0].slice(-6);
      return n10 == 1 && n100 != 11 && n100 != 71 && n100 != 91 ? 'one' : n10 == 2 && n100 != 12 && n100 != 72 && n100 != 92 ? 'two' : (n10 == 3 || n10 == 4 || n10 == 9) && (n100 < 10 || n100 > 19) && (n100 < 70 || n100 > 79) && (n100 < 90 || n100 > 99) ? 'few' : n != 0 && t0 && n1000000 == 0 ? 'many' : 'other';
    };
    const brx$2 = a$2;
    const bs$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2),
        f10 = f.slice(-1),
        f100 = f.slice(-2);
      return v0 && i10 == 1 && i100 != 11 || f10 == 1 && f100 != 11 ? 'one' : v0 && i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14) || f10 >= 2 && f10 <= 4 && (f100 < 12 || f100 > 14) ? 'few' : 'other';
    };
    const ca$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i1000000 = i.slice(-6);
      return n == 1 && v0 ? 'one' : i != 0 && i1000000 == 0 && v0 ? 'many' : 'other';
    };
    const ce$2 = a$2;
    const ceb$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        f10 = f.slice(-1);
      return v0 && (i == 1 || i == 2 || i == 3) || v0 && i10 != 4 && i10 != 6 && i10 != 9 || !v0 && f10 != 4 && f10 != 6 && f10 != 9 ? 'one' : 'other';
    };
    const cgg$2 = a$2;
    const chr$2 = a$2;
    const ckb$2 = a$2;
    const cs$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1];
      return n == 1 && v0 ? 'one' : i >= 2 && i <= 4 && v0 ? 'few' : !v0 ? 'many' : 'other';
    };
    const cy$2 = n => n == 0 ? 'zero' : n == 1 ? 'one' : n == 2 ? 'two' : n == 3 ? 'few' : n == 6 ? 'many' : 'other';
    const da$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        t0 = Number(s[0]) == n;
      return n == 1 || !t0 && (i == 0 || i == 1) ? 'one' : 'other';
    };
    const de$2 = d$2;
    const doi$2 = c$2;
    const dsb$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i100 = i.slice(-2),
        f100 = f.slice(-2);
      return v0 && i100 == 1 || f100 == 1 ? 'one' : v0 && i100 == 2 || f100 == 2 ? 'two' : v0 && (i100 == 3 || i100 == 4) || f100 == 3 || f100 == 4 ? 'few' : 'other';
    };
    const dv$2 = a$2;
    const dz$2 = e$1;
    const ee$2 = a$2;
    const el$2 = a$2;
    const en$2 = d$2;
    const eo$2 = a$2;
    const es$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i1000000 = i.slice(-6);
      return n == 1 ? 'one' : i != 0 && i1000000 == 0 && v0 ? 'many' : 'other';
    };
    const et$2 = d$2;
    const eu$2 = a$2;
    const fa$2 = c$2;
    const ff$2 = n => n >= 0 && n < 2 ? 'one' : 'other';
    const fi$2 = d$2;
    const fil$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        f10 = f.slice(-1);
      return v0 && (i == 1 || i == 2 || i == 3) || v0 && i10 != 4 && i10 != 6 && i10 != 9 || !v0 && f10 != 4 && f10 != 6 && f10 != 9 ? 'one' : 'other';
    };
    const fo$2 = a$2;
    const fr$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i1000000 = i.slice(-6);
      return n >= 0 && n < 2 ? 'one' : i != 0 && i1000000 == 0 && v0 ? 'many' : 'other';
    };
    const fur$2 = a$2;
    const fy$2 = d$2;
    const ga$2 = n => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n;
      return n == 1 ? 'one' : n == 2 ? 'two' : t0 && n >= 3 && n <= 6 ? 'few' : t0 && n >= 7 && n <= 10 ? 'many' : 'other';
    };
    const gd$2 = n => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n;
      return n == 1 || n == 11 ? 'one' : n == 2 || n == 12 ? 'two' : t0 && n >= 3 && n <= 10 || t0 && n >= 13 && n <= 19 ? 'few' : 'other';
    };
    const gl$2 = d$2;
    const gsw$2 = a$2;
    const gu$2 = c$2;
    const guw$2 = b$2;
    const gv$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2);
      return v0 && i10 == 1 ? 'one' : v0 && i10 == 2 ? 'two' : v0 && (i100 == 0 || i100 == 20 || i100 == 40 || i100 == 60 || i100 == 80) ? 'few' : !v0 ? 'many' : 'other';
    };
    const ha$2 = a$2;
    const haw$2 = a$2;
    const he$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1];
      return i == 1 && v0 || i == 0 && !v0 ? 'one' : i == 2 && v0 ? 'two' : 'other';
    };
    const hi$2 = c$2;
    const hnj$2 = e$1;
    const hr$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2),
        f10 = f.slice(-1),
        f100 = f.slice(-2);
      return v0 && i10 == 1 && i100 != 11 || f10 == 1 && f100 != 11 ? 'one' : v0 && i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14) || f10 >= 2 && f10 <= 4 && (f100 < 12 || f100 > 14) ? 'few' : 'other';
    };
    const hsb$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i100 = i.slice(-2),
        f100 = f.slice(-2);
      return v0 && i100 == 1 || f100 == 1 ? 'one' : v0 && i100 == 2 || f100 == 2 ? 'two' : v0 && (i100 == 3 || i100 == 4) || f100 == 3 || f100 == 4 ? 'few' : 'other';
    };
    const hu$2 = a$2;
    const hy$2 = n => n >= 0 && n < 2 ? 'one' : 'other';
    const ia$2 = d$2;
    const id$2 = e$1;
    const ig$2 = e$1;
    const ii$2 = e$1;
    const io$2 = d$2;
    const is$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        t = (s[1] || '').replace(/0+$/, ''),
        t0 = Number(s[0]) == n,
        i10 = i.slice(-1),
        i100 = i.slice(-2);
      return t0 && i10 == 1 && i100 != 11 || t % 10 == 1 && t % 100 != 11 ? 'one' : 'other';
    };
    const it$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i1000000 = i.slice(-6);
      return n == 1 && v0 ? 'one' : i != 0 && i1000000 == 0 && v0 ? 'many' : 'other';
    };
    const iu$2 = f$2;
    const ja$2 = e$1;
    const jbo$2 = e$1;
    const jgo$2 = a$2;
    const jmc$2 = a$2;
    const jv$2 = e$1;
    const jw$2 = e$1;
    const ka$2 = a$2;
    const kab$2 = n => n >= 0 && n < 2 ? 'one' : 'other';
    const kaj$2 = a$2;
    const kcg$2 = a$2;
    const kde$2 = e$1;
    const kea$2 = e$1;
    const kk$2 = a$2;
    const kkj$2 = a$2;
    const kl$2 = a$2;
    const km$2 = e$1;
    const kn$2 = c$2;
    const ko$2 = e$1;
    const ks$2 = a$2;
    const ksb$2 = a$2;
    const ksh$2 = n => n == 0 ? 'zero' : n == 1 ? 'one' : 'other';
    const ku$2 = a$2;
    const kw$2 = n => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n100 = t0 && s[0].slice(-2),
        n1000 = t0 && s[0].slice(-3),
        n100000 = t0 && s[0].slice(-5),
        n1000000 = t0 && s[0].slice(-6);
      return n == 0 ? 'zero' : n == 1 ? 'one' : n100 == 2 || n100 == 22 || n100 == 42 || n100 == 62 || n100 == 82 || t0 && n1000 == 0 && (n100000 >= 1000 && n100000 <= 20000 || n100000 == 40000 || n100000 == 60000 || n100000 == 80000) || n != 0 && n1000000 == 100000 ? 'two' : n100 == 3 || n100 == 23 || n100 == 43 || n100 == 63 || n100 == 83 ? 'few' : n != 1 && (n100 == 1 || n100 == 21 || n100 == 41 || n100 == 61 || n100 == 81) ? 'many' : 'other';
    };
    const ky$2 = a$2;
    const lag$2 = n => {
      const s = String(n).split('.'),
        i = s[0];
      return n == 0 ? 'zero' : (i == 0 || i == 1) && n != 0 ? 'one' : 'other';
    };
    const lb$2 = a$2;
    const lg$2 = a$2;
    const lij$2 = d$2;
    const lkt$2 = e$1;
    const ln$2 = b$2;
    const lo$2 = e$1;
    const lt$2 = n => {
      const s = String(n).split('.'),
        f = s[1] || '',
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2);
      return n10 == 1 && (n100 < 11 || n100 > 19) ? 'one' : n10 >= 2 && n10 <= 9 && (n100 < 11 || n100 > 19) ? 'few' : f != 0 ? 'many' : 'other';
    };
    const lv$2 = n => {
      const s = String(n).split('.'),
        f = s[1] || '',
        v = f.length,
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2),
        f100 = f.slice(-2),
        f10 = f.slice(-1);
      return t0 && n10 == 0 || n100 >= 11 && n100 <= 19 || v == 2 && f100 >= 11 && f100 <= 19 ? 'zero' : n10 == 1 && n100 != 11 || v == 2 && f10 == 1 && f100 != 11 || v != 2 && f10 == 1 ? 'one' : 'other';
    };
    const mas$2 = a$2;
    const mg$2 = b$2;
    const mgo$2 = a$2;
    const mk$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2),
        f10 = f.slice(-1),
        f100 = f.slice(-2);
      return v0 && i10 == 1 && i100 != 11 || f10 == 1 && f100 != 11 ? 'one' : 'other';
    };
    const ml$2 = a$2;
    const mn$2 = a$2;
    const mo$2 = n => {
      const s = String(n).split('.'),
        v0 = !s[1],
        t0 = Number(s[0]) == n,
        n100 = t0 && s[0].slice(-2);
      return n == 1 && v0 ? 'one' : !v0 || n == 0 || n != 1 && n100 >= 1 && n100 <= 19 ? 'few' : 'other';
    };
    const mr$2 = a$2;
    const ms$2 = e$1;
    const mt$2 = n => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n100 = t0 && s[0].slice(-2);
      return n == 1 ? 'one' : n == 2 ? 'two' : n == 0 || n100 >= 3 && n100 <= 10 ? 'few' : n100 >= 11 && n100 <= 19 ? 'many' : 'other';
    };
    const my$2 = e$1;
    const nah$2 = a$2;
    const naq$2 = f$2;
    const nb$2 = a$2;
    const nd$2 = a$2;
    const ne$2 = a$2;
    const nl$2 = d$2;
    const nn$2 = a$2;
    const nnh$2 = a$2;
    const no$2 = a$2;
    const nqo$2 = e$1;
    const nr$2 = a$2;
    const nso$2 = b$2;
    const ny$2 = a$2;
    const nyn$2 = a$2;
    const om$2 = a$2;
    const or$2 = a$2;
    const os$2 = a$2;
    const osa$2 = e$1;
    const pa$2 = b$2;
    const pap$2 = a$2;
    const pcm$2 = c$2;
    const pl$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2);
      return n == 1 && v0 ? 'one' : v0 && i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14) ? 'few' : v0 && i != 1 && (i10 == 0 || i10 == 1) || v0 && i10 >= 5 && i10 <= 9 || v0 && i100 >= 12 && i100 <= 14 ? 'many' : 'other';
    };
    const prg$2 = n => {
      const s = String(n).split('.'),
        f = s[1] || '',
        v = f.length,
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2),
        f100 = f.slice(-2),
        f10 = f.slice(-1);
      return t0 && n10 == 0 || n100 >= 11 && n100 <= 19 || v == 2 && f100 >= 11 && f100 <= 19 ? 'zero' : n10 == 1 && n100 != 11 || v == 2 && f10 == 1 && f100 != 11 || v != 2 && f10 == 1 ? 'one' : 'other';
    };
    const ps$2 = a$2;
    const pt$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i1000000 = i.slice(-6);
      return i == 0 || i == 1 ? 'one' : i != 0 && i1000000 == 0 && v0 ? 'many' : 'other';
    };
    const pt_PT$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i1000000 = i.slice(-6);
      return n == 1 && v0 ? 'one' : i != 0 && i1000000 == 0 && v0 ? 'many' : 'other';
    };
    const rm$2 = a$2;
    const ro$2 = n => {
      const s = String(n).split('.'),
        v0 = !s[1],
        t0 = Number(s[0]) == n,
        n100 = t0 && s[0].slice(-2);
      return n == 1 && v0 ? 'one' : !v0 || n == 0 || n != 1 && n100 >= 1 && n100 <= 19 ? 'few' : 'other';
    };
    const rof$2 = a$2;
    const ru$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2);
      return v0 && i10 == 1 && i100 != 11 ? 'one' : v0 && i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14) ? 'few' : v0 && i10 == 0 || v0 && i10 >= 5 && i10 <= 9 || v0 && i100 >= 11 && i100 <= 14 ? 'many' : 'other';
    };
    const rwk$2 = a$2;
    const sah$2 = e$1;
    const saq$2 = a$2;
    const sat$2 = f$2;
    const sc$2 = d$2;
    const scn$2 = d$2;
    const sd$2 = a$2;
    const sdh$2 = a$2;
    const se$2 = f$2;
    const seh$2 = a$2;
    const ses$2 = e$1;
    const sg$2 = e$1;
    const sh$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2),
        f10 = f.slice(-1),
        f100 = f.slice(-2);
      return v0 && i10 == 1 && i100 != 11 || f10 == 1 && f100 != 11 ? 'one' : v0 && i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14) || f10 >= 2 && f10 <= 4 && (f100 < 12 || f100 > 14) ? 'few' : 'other';
    };
    const shi$2 = n => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n;
      return n >= 0 && n <= 1 ? 'one' : t0 && n >= 2 && n <= 10 ? 'few' : 'other';
    };
    const si$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '';
      return n == 0 || n == 1 || i == 0 && f == 1 ? 'one' : 'other';
    };
    const sk$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1];
      return n == 1 && v0 ? 'one' : i >= 2 && i <= 4 && v0 ? 'few' : !v0 ? 'many' : 'other';
    };
    const sl$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i100 = i.slice(-2);
      return v0 && i100 == 1 ? 'one' : v0 && i100 == 2 ? 'two' : v0 && (i100 == 3 || i100 == 4) || !v0 ? 'few' : 'other';
    };
    const sma$2 = f$2;
    const smi$2 = f$2;
    const smj$2 = f$2;
    const smn$2 = f$2;
    const sms$2 = f$2;
    const sn$2 = a$2;
    const so$2 = a$2;
    const sq$2 = a$2;
    const sr$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2),
        f10 = f.slice(-1),
        f100 = f.slice(-2);
      return v0 && i10 == 1 && i100 != 11 || f10 == 1 && f100 != 11 ? 'one' : v0 && i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14) || f10 >= 2 && f10 <= 4 && (f100 < 12 || f100 > 14) ? 'few' : 'other';
    };
    const ss$2 = a$2;
    const ssy$2 = a$2;
    const st$2 = a$2;
    const su$2 = e$1;
    const sv$2 = d$2;
    const sw$2 = d$2;
    const syr$2 = a$2;
    const ta$2 = a$2;
    const te$2 = a$2;
    const teo$2 = a$2;
    const th$2 = e$1;
    const ti$2 = b$2;
    const tig$2 = a$2;
    const tk$2 = a$2;
    const tl$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        f10 = f.slice(-1);
      return v0 && (i == 1 || i == 2 || i == 3) || v0 && i10 != 4 && i10 != 6 && i10 != 9 || !v0 && f10 != 4 && f10 != 6 && f10 != 9 ? 'one' : 'other';
    };
    const tn$2 = a$2;
    const to$2 = e$1;
    const tpi$2 = e$1;
    const tr$2 = a$2;
    const ts$2 = a$2;
    const tzm$2 = n => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n;
      return n == 0 || n == 1 || t0 && n >= 11 && n <= 99 ? 'one' : 'other';
    };
    const ug$2 = a$2;
    const uk$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2);
      return v0 && i10 == 1 && i100 != 11 ? 'one' : v0 && i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14) ? 'few' : v0 && i10 == 0 || v0 && i10 >= 5 && i10 <= 9 || v0 && i100 >= 11 && i100 <= 14 ? 'many' : 'other';
    };
    const und$2 = e$1;
    const ur$2 = d$2;
    const uz$2 = a$2;
    const ve$2 = a$2;
    const vec$2 = n => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i1000000 = i.slice(-6);
      return n == 1 && v0 ? 'one' : i != 0 && i1000000 == 0 && v0 ? 'many' : 'other';
    };
    const vi$2 = e$1;
    const vo$2 = a$2;
    const vun$2 = a$2;
    const wa$2 = b$2;
    const wae$2 = a$2;
    const wo$2 = e$1;
    const xh$2 = a$2;
    const xog$2 = a$2;
    const yi$2 = d$2;
    const yo$2 = e$1;
    const yue$2 = e$1;
    const zh$2 = e$1;
    const zu$2 = c$2;

    var Cardinals = /*#__PURE__*/Object.freeze({
        __proto__: null,
        af: af$2,
        ak: ak$2,
        am: am$2,
        an: an$2,
        ar: ar$2,
        ars: ars$2,
        as: as$2,
        asa: asa$2,
        ast: ast$2,
        az: az$2,
        bal: bal$2,
        be: be$2,
        bem: bem$2,
        bez: bez$2,
        bg: bg$2,
        bho: bho$2,
        bm: bm$2,
        bn: bn$2,
        bo: bo$2,
        br: br$2,
        brx: brx$2,
        bs: bs$2,
        ca: ca$2,
        ce: ce$2,
        ceb: ceb$2,
        cgg: cgg$2,
        chr: chr$2,
        ckb: ckb$2,
        cs: cs$2,
        cy: cy$2,
        da: da$2,
        de: de$2,
        doi: doi$2,
        dsb: dsb$2,
        dv: dv$2,
        dz: dz$2,
        ee: ee$2,
        el: el$2,
        en: en$2,
        eo: eo$2,
        es: es$2,
        et: et$2,
        eu: eu$2,
        fa: fa$2,
        ff: ff$2,
        fi: fi$2,
        fil: fil$2,
        fo: fo$2,
        fr: fr$2,
        fur: fur$2,
        fy: fy$2,
        ga: ga$2,
        gd: gd$2,
        gl: gl$2,
        gsw: gsw$2,
        gu: gu$2,
        guw: guw$2,
        gv: gv$2,
        ha: ha$2,
        haw: haw$2,
        he: he$2,
        hi: hi$2,
        hnj: hnj$2,
        hr: hr$2,
        hsb: hsb$2,
        hu: hu$2,
        hy: hy$2,
        ia: ia$2,
        id: id$2,
        ig: ig$2,
        ii: ii$2,
        io: io$2,
        is: is$2,
        it: it$2,
        iu: iu$2,
        ja: ja$2,
        jbo: jbo$2,
        jgo: jgo$2,
        jmc: jmc$2,
        jv: jv$2,
        jw: jw$2,
        ka: ka$2,
        kab: kab$2,
        kaj: kaj$2,
        kcg: kcg$2,
        kde: kde$2,
        kea: kea$2,
        kk: kk$2,
        kkj: kkj$2,
        kl: kl$2,
        km: km$2,
        kn: kn$2,
        ko: ko$2,
        ks: ks$2,
        ksb: ksb$2,
        ksh: ksh$2,
        ku: ku$2,
        kw: kw$2,
        ky: ky$2,
        lag: lag$2,
        lb: lb$2,
        lg: lg$2,
        lij: lij$2,
        lkt: lkt$2,
        ln: ln$2,
        lo: lo$2,
        lt: lt$2,
        lv: lv$2,
        mas: mas$2,
        mg: mg$2,
        mgo: mgo$2,
        mk: mk$2,
        ml: ml$2,
        mn: mn$2,
        mo: mo$2,
        mr: mr$2,
        ms: ms$2,
        mt: mt$2,
        my: my$2,
        nah: nah$2,
        naq: naq$2,
        nb: nb$2,
        nd: nd$2,
        ne: ne$2,
        nl: nl$2,
        nn: nn$2,
        nnh: nnh$2,
        no: no$2,
        nqo: nqo$2,
        nr: nr$2,
        nso: nso$2,
        ny: ny$2,
        nyn: nyn$2,
        om: om$2,
        or: or$2,
        os: os$2,
        osa: osa$2,
        pa: pa$2,
        pap: pap$2,
        pcm: pcm$2,
        pl: pl$2,
        prg: prg$2,
        ps: ps$2,
        pt: pt$2,
        pt_PT: pt_PT$2,
        rm: rm$2,
        ro: ro$2,
        rof: rof$2,
        ru: ru$2,
        rwk: rwk$2,
        sah: sah$2,
        saq: saq$2,
        sat: sat$2,
        sc: sc$2,
        scn: scn$2,
        sd: sd$2,
        sdh: sdh$2,
        se: se$2,
        seh: seh$2,
        ses: ses$2,
        sg: sg$2,
        sh: sh$2,
        shi: shi$2,
        si: si$2,
        sk: sk$2,
        sl: sl$2,
        sma: sma$2,
        smi: smi$2,
        smj: smj$2,
        smn: smn$2,
        sms: sms$2,
        sn: sn$2,
        so: so$2,
        sq: sq$2,
        sr: sr$2,
        ss: ss$2,
        ssy: ssy$2,
        st: st$2,
        su: su$2,
        sv: sv$2,
        sw: sw$2,
        syr: syr$2,
        ta: ta$2,
        te: te$2,
        teo: teo$2,
        th: th$2,
        ti: ti$2,
        tig: tig$2,
        tk: tk$2,
        tl: tl$2,
        tn: tn$2,
        to: to$2,
        tpi: tpi$2,
        tr: tr$2,
        ts: ts$2,
        tzm: tzm$2,
        ug: ug$2,
        uk: uk$2,
        und: und$2,
        ur: ur$2,
        uz: uz$2,
        ve: ve$2,
        vec: vec$2,
        vi: vi$2,
        vo: vo$2,
        vun: vun$2,
        wa: wa$2,
        wae: wae$2,
        wo: wo$2,
        xh: xh$2,
        xog: xog$2,
        yi: yi$2,
        yo: yo$2,
        yue: yue$2,
        zh: zh$2,
        zu: zu$2
    });

    const z = "zero",
      o = "one",
      t = "two",
      f$1 = "few",
      m = "many",
      x = "other";
    const a$1 = {
      cardinal: [o, x],
      ordinal: [x]
    };
    const b$1 = {
      cardinal: [o, x],
      ordinal: [o, x]
    };
    const c$1 = {
      cardinal: [x],
      ordinal: [x]
    };
    const d$1 = {
      cardinal: [o, t, x],
      ordinal: [x]
    };
    const af$1 = a$1;
    const ak$1 = a$1;
    const am$1 = a$1;
    const an$1 = a$1;
    const ar$1 = {
      cardinal: [z, o, t, f$1, m, x],
      ordinal: [x]
    };
    const ars$1 = {
      cardinal: [z, o, t, f$1, m, x],
      ordinal: [x]
    };
    const as$1 = {
      cardinal: [o, x],
      ordinal: [o, t, f$1, m, x]
    };
    const asa$1 = a$1;
    const ast$1 = a$1;
    const az$1 = {
      cardinal: [o, x],
      ordinal: [o, f$1, m, x]
    };
    const bal$1 = b$1;
    const be$1 = {
      cardinal: [o, f$1, m, x],
      ordinal: [f$1, x]
    };
    const bem$1 = a$1;
    const bez$1 = a$1;
    const bg$1 = a$1;
    const bho$1 = a$1;
    const bm$1 = c$1;
    const bn$1 = {
      cardinal: [o, x],
      ordinal: [o, t, f$1, m, x]
    };
    const bo$1 = c$1;
    const br$1 = {
      cardinal: [o, t, f$1, m, x],
      ordinal: [x]
    };
    const brx$1 = a$1;
    const bs$1 = {
      cardinal: [o, f$1, x],
      ordinal: [x]
    };
    const ca$1 = {
      cardinal: [o, m, x],
      ordinal: [o, t, f$1, x]
    };
    const ce$1 = a$1;
    const ceb$1 = a$1;
    const cgg$1 = a$1;
    const chr$1 = a$1;
    const ckb$1 = a$1;
    const cs$1 = {
      cardinal: [o, f$1, m, x],
      ordinal: [x]
    };
    const cy$1 = {
      cardinal: [z, o, t, f$1, m, x],
      ordinal: [z, o, t, f$1, m, x]
    };
    const da$1 = a$1;
    const de$1 = a$1;
    const doi$1 = a$1;
    const dsb$1 = {
      cardinal: [o, t, f$1, x],
      ordinal: [x]
    };
    const dv$1 = a$1;
    const dz$1 = c$1;
    const ee$1 = a$1;
    const el$1 = a$1;
    const en$1 = {
      cardinal: [o, x],
      ordinal: [o, t, f$1, x]
    };
    const eo$1 = a$1;
    const es$1 = {
      cardinal: [o, m, x],
      ordinal: [x]
    };
    const et$1 = a$1;
    const eu$1 = a$1;
    const fa$1 = a$1;
    const ff$1 = a$1;
    const fi$1 = a$1;
    const fil$1 = b$1;
    const fo$1 = a$1;
    const fr$1 = {
      cardinal: [o, m, x],
      ordinal: [o, x]
    };
    const fur$1 = a$1;
    const fy$1 = a$1;
    const ga$1 = {
      cardinal: [o, t, f$1, m, x],
      ordinal: [o, x]
    };
    const gd$1 = {
      cardinal: [o, t, f$1, x],
      ordinal: [o, t, f$1, x]
    };
    const gl$1 = a$1;
    const gsw$1 = a$1;
    const gu$1 = {
      cardinal: [o, x],
      ordinal: [o, t, f$1, m, x]
    };
    const guw$1 = a$1;
    const gv$1 = {
      cardinal: [o, t, f$1, m, x],
      ordinal: [x]
    };
    const ha$1 = a$1;
    const haw$1 = a$1;
    const he$1 = d$1;
    const hi$1 = {
      cardinal: [o, x],
      ordinal: [o, t, f$1, m, x]
    };
    const hnj$1 = c$1;
    const hr$1 = {
      cardinal: [o, f$1, x],
      ordinal: [x]
    };
    const hsb$1 = {
      cardinal: [o, t, f$1, x],
      ordinal: [x]
    };
    const hu$1 = b$1;
    const hy$1 = b$1;
    const ia$1 = a$1;
    const id$1 = c$1;
    const ig$1 = c$1;
    const ii$1 = c$1;
    const io$1 = a$1;
    const is$1 = a$1;
    const it$1 = {
      cardinal: [o, m, x],
      ordinal: [m, x]
    };
    const iu$1 = d$1;
    const ja$1 = c$1;
    const jbo$1 = c$1;
    const jgo$1 = a$1;
    const jmc$1 = a$1;
    const jv$1 = c$1;
    const jw$1 = c$1;
    const ka$1 = {
      cardinal: [o, x],
      ordinal: [o, m, x]
    };
    const kab$1 = a$1;
    const kaj$1 = a$1;
    const kcg$1 = a$1;
    const kde$1 = c$1;
    const kea$1 = c$1;
    const kk$1 = {
      cardinal: [o, x],
      ordinal: [m, x]
    };
    const kkj$1 = a$1;
    const kl$1 = a$1;
    const km$1 = c$1;
    const kn$1 = a$1;
    const ko$1 = c$1;
    const ks$1 = a$1;
    const ksb$1 = a$1;
    const ksh$1 = {
      cardinal: [z, o, x],
      ordinal: [x]
    };
    const ku$1 = a$1;
    const kw$1 = {
      cardinal: [z, o, t, f$1, m, x],
      ordinal: [o, m, x]
    };
    const ky$1 = a$1;
    const lag$1 = {
      cardinal: [z, o, x],
      ordinal: [x]
    };
    const lb$1 = a$1;
    const lg$1 = a$1;
    const lij$1 = {
      cardinal: [o, x],
      ordinal: [m, x]
    };
    const lkt$1 = c$1;
    const ln$1 = a$1;
    const lo$1 = {
      cardinal: [x],
      ordinal: [o, x]
    };
    const lt$1 = {
      cardinal: [o, f$1, m, x],
      ordinal: [x]
    };
    const lv$1 = {
      cardinal: [z, o, x],
      ordinal: [x]
    };
    const mas$1 = a$1;
    const mg$1 = a$1;
    const mgo$1 = a$1;
    const mk$1 = {
      cardinal: [o, x],
      ordinal: [o, t, m, x]
    };
    const ml$1 = a$1;
    const mn$1 = a$1;
    const mo$1 = {
      cardinal: [o, f$1, x],
      ordinal: [o, x]
    };
    const mr$1 = {
      cardinal: [o, x],
      ordinal: [o, t, f$1, x]
    };
    const ms$1 = {
      cardinal: [x],
      ordinal: [o, x]
    };
    const mt$1 = {
      cardinal: [o, t, f$1, m, x],
      ordinal: [x]
    };
    const my$1 = c$1;
    const nah$1 = a$1;
    const naq$1 = d$1;
    const nb$1 = a$1;
    const nd$1 = a$1;
    const ne$1 = b$1;
    const nl$1 = a$1;
    const nn$1 = a$1;
    const nnh$1 = a$1;
    const no$1 = a$1;
    const nqo$1 = c$1;
    const nr$1 = a$1;
    const nso$1 = a$1;
    const ny$1 = a$1;
    const nyn$1 = a$1;
    const om$1 = a$1;
    const or$1 = {
      cardinal: [o, x],
      ordinal: [o, t, f$1, m, x]
    };
    const os$1 = a$1;
    const osa$1 = c$1;
    const pa$1 = a$1;
    const pap$1 = a$1;
    const pcm$1 = a$1;
    const pl$1 = {
      cardinal: [o, f$1, m, x],
      ordinal: [x]
    };
    const prg$1 = {
      cardinal: [z, o, x],
      ordinal: [x]
    };
    const ps$1 = a$1;
    const pt$1 = {
      cardinal: [o, m, x],
      ordinal: [x]
    };
    const pt_PT$1 = {
      cardinal: [o, m, x],
      ordinal: [x]
    };
    const rm$1 = a$1;
    const ro$1 = {
      cardinal: [o, f$1, x],
      ordinal: [o, x]
    };
    const rof$1 = a$1;
    const ru$1 = {
      cardinal: [o, f$1, m, x],
      ordinal: [x]
    };
    const rwk$1 = a$1;
    const sah$1 = c$1;
    const saq$1 = a$1;
    const sat$1 = d$1;
    const sc$1 = {
      cardinal: [o, x],
      ordinal: [m, x]
    };
    const scn$1 = {
      cardinal: [o, x],
      ordinal: [m, x]
    };
    const sd$1 = a$1;
    const sdh$1 = a$1;
    const se$1 = d$1;
    const seh$1 = a$1;
    const ses$1 = c$1;
    const sg$1 = c$1;
    const sh$1 = {
      cardinal: [o, f$1, x],
      ordinal: [x]
    };
    const shi$1 = {
      cardinal: [o, f$1, x],
      ordinal: [x]
    };
    const si$1 = a$1;
    const sk$1 = {
      cardinal: [o, f$1, m, x],
      ordinal: [x]
    };
    const sl$1 = {
      cardinal: [o, t, f$1, x],
      ordinal: [x]
    };
    const sma$1 = d$1;
    const smi$1 = d$1;
    const smj$1 = d$1;
    const smn$1 = d$1;
    const sms$1 = d$1;
    const sn$1 = a$1;
    const so$1 = a$1;
    const sq$1 = {
      cardinal: [o, x],
      ordinal: [o, m, x]
    };
    const sr$1 = {
      cardinal: [o, f$1, x],
      ordinal: [x]
    };
    const ss$1 = a$1;
    const ssy$1 = a$1;
    const st$1 = a$1;
    const su$1 = c$1;
    const sv$1 = b$1;
    const sw$1 = a$1;
    const syr$1 = a$1;
    const ta$1 = a$1;
    const te$1 = a$1;
    const teo$1 = a$1;
    const th$1 = c$1;
    const ti$1 = a$1;
    const tig$1 = a$1;
    const tk$1 = {
      cardinal: [o, x],
      ordinal: [f$1, x]
    };
    const tl$1 = b$1;
    const tn$1 = a$1;
    const to$1 = c$1;
    const tpi$1 = c$1;
    const tr$1 = a$1;
    const ts$1 = a$1;
    const tzm$1 = a$1;
    const ug$1 = a$1;
    const uk$1 = {
      cardinal: [o, f$1, m, x],
      ordinal: [f$1, x]
    };
    const und$1 = c$1;
    const ur$1 = a$1;
    const uz$1 = a$1;
    const ve$1 = a$1;
    const vec$1 = {
      cardinal: [o, m, x],
      ordinal: [m, x]
    };
    const vi$1 = {
      cardinal: [x],
      ordinal: [o, x]
    };
    const vo$1 = a$1;
    const vun$1 = a$1;
    const wa$1 = a$1;
    const wae$1 = a$1;
    const wo$1 = c$1;
    const xh$1 = a$1;
    const xog$1 = a$1;
    const yi$1 = a$1;
    const yo$1 = c$1;
    const yue$1 = c$1;
    const zh$1 = c$1;
    const zu$1 = a$1;

    var PluralCategories = /*#__PURE__*/Object.freeze({
        __proto__: null,
        af: af$1,
        ak: ak$1,
        am: am$1,
        an: an$1,
        ar: ar$1,
        ars: ars$1,
        as: as$1,
        asa: asa$1,
        ast: ast$1,
        az: az$1,
        bal: bal$1,
        be: be$1,
        bem: bem$1,
        bez: bez$1,
        bg: bg$1,
        bho: bho$1,
        bm: bm$1,
        bn: bn$1,
        bo: bo$1,
        br: br$1,
        brx: brx$1,
        bs: bs$1,
        ca: ca$1,
        ce: ce$1,
        ceb: ceb$1,
        cgg: cgg$1,
        chr: chr$1,
        ckb: ckb$1,
        cs: cs$1,
        cy: cy$1,
        da: da$1,
        de: de$1,
        doi: doi$1,
        dsb: dsb$1,
        dv: dv$1,
        dz: dz$1,
        ee: ee$1,
        el: el$1,
        en: en$1,
        eo: eo$1,
        es: es$1,
        et: et$1,
        eu: eu$1,
        fa: fa$1,
        ff: ff$1,
        fi: fi$1,
        fil: fil$1,
        fo: fo$1,
        fr: fr$1,
        fur: fur$1,
        fy: fy$1,
        ga: ga$1,
        gd: gd$1,
        gl: gl$1,
        gsw: gsw$1,
        gu: gu$1,
        guw: guw$1,
        gv: gv$1,
        ha: ha$1,
        haw: haw$1,
        he: he$1,
        hi: hi$1,
        hnj: hnj$1,
        hr: hr$1,
        hsb: hsb$1,
        hu: hu$1,
        hy: hy$1,
        ia: ia$1,
        id: id$1,
        ig: ig$1,
        ii: ii$1,
        io: io$1,
        is: is$1,
        it: it$1,
        iu: iu$1,
        ja: ja$1,
        jbo: jbo$1,
        jgo: jgo$1,
        jmc: jmc$1,
        jv: jv$1,
        jw: jw$1,
        ka: ka$1,
        kab: kab$1,
        kaj: kaj$1,
        kcg: kcg$1,
        kde: kde$1,
        kea: kea$1,
        kk: kk$1,
        kkj: kkj$1,
        kl: kl$1,
        km: km$1,
        kn: kn$1,
        ko: ko$1,
        ks: ks$1,
        ksb: ksb$1,
        ksh: ksh$1,
        ku: ku$1,
        kw: kw$1,
        ky: ky$1,
        lag: lag$1,
        lb: lb$1,
        lg: lg$1,
        lij: lij$1,
        lkt: lkt$1,
        ln: ln$1,
        lo: lo$1,
        lt: lt$1,
        lv: lv$1,
        mas: mas$1,
        mg: mg$1,
        mgo: mgo$1,
        mk: mk$1,
        ml: ml$1,
        mn: mn$1,
        mo: mo$1,
        mr: mr$1,
        ms: ms$1,
        mt: mt$1,
        my: my$1,
        nah: nah$1,
        naq: naq$1,
        nb: nb$1,
        nd: nd$1,
        ne: ne$1,
        nl: nl$1,
        nn: nn$1,
        nnh: nnh$1,
        no: no$1,
        nqo: nqo$1,
        nr: nr$1,
        nso: nso$1,
        ny: ny$1,
        nyn: nyn$1,
        om: om$1,
        or: or$1,
        os: os$1,
        osa: osa$1,
        pa: pa$1,
        pap: pap$1,
        pcm: pcm$1,
        pl: pl$1,
        prg: prg$1,
        ps: ps$1,
        pt: pt$1,
        pt_PT: pt_PT$1,
        rm: rm$1,
        ro: ro$1,
        rof: rof$1,
        ru: ru$1,
        rwk: rwk$1,
        sah: sah$1,
        saq: saq$1,
        sat: sat$1,
        sc: sc$1,
        scn: scn$1,
        sd: sd$1,
        sdh: sdh$1,
        se: se$1,
        seh: seh$1,
        ses: ses$1,
        sg: sg$1,
        sh: sh$1,
        shi: shi$1,
        si: si$1,
        sk: sk$1,
        sl: sl$1,
        sma: sma$1,
        smi: smi$1,
        smj: smj$1,
        smn: smn$1,
        sms: sms$1,
        sn: sn$1,
        so: so$1,
        sq: sq$1,
        sr: sr$1,
        ss: ss$1,
        ssy: ssy$1,
        st: st$1,
        su: su$1,
        sv: sv$1,
        sw: sw$1,
        syr: syr$1,
        ta: ta$1,
        te: te$1,
        teo: teo$1,
        th: th$1,
        ti: ti$1,
        tig: tig$1,
        tk: tk$1,
        tl: tl$1,
        tn: tn$1,
        to: to$1,
        tpi: tpi$1,
        tr: tr$1,
        ts: ts$1,
        tzm: tzm$1,
        ug: ug$1,
        uk: uk$1,
        und: und$1,
        ur: ur$1,
        uz: uz$1,
        ve: ve$1,
        vec: vec$1,
        vi: vi$1,
        vo: vo$1,
        vun: vun$1,
        wa: wa$1,
        wae: wae$1,
        wo: wo$1,
        xh: xh$1,
        xog: xog$1,
        yi: yi$1,
        yo: yo$1,
        yue: yue$1,
        zh: zh$1,
        zu: zu$1
    });

    const a = (n, ord) => {
      if (ord) return 'other';
      return n == 1 ? 'one' : 'other';
    };
    const b = (n, ord) => {
      if (ord) return 'other';
      return n == 0 || n == 1 ? 'one' : 'other';
    };
    const c = (n, ord) => {
      if (ord) return 'other';
      return n >= 0 && n <= 1 ? 'one' : 'other';
    };
    const d = (n, ord) => {
      const s = String(n).split('.'),
        v0 = !s[1];
      if (ord) return 'other';
      return n == 1 && v0 ? 'one' : 'other';
    };
    const e = (n, ord) => 'other';
    const f = (n, ord) => {
      if (ord) return 'other';
      return n == 1 ? 'one' : n == 2 ? 'two' : 'other';
    };
    const af = a;
    const ak = b;
    const am = c;
    const an = a;
    const ar = (n, ord) => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n100 = t0 && s[0].slice(-2);
      if (ord) return 'other';
      return n == 0 ? 'zero' : n == 1 ? 'one' : n == 2 ? 'two' : n100 >= 3 && n100 <= 10 ? 'few' : n100 >= 11 && n100 <= 99 ? 'many' : 'other';
    };
    const ars = (n, ord) => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n100 = t0 && s[0].slice(-2);
      if (ord) return 'other';
      return n == 0 ? 'zero' : n == 1 ? 'one' : n == 2 ? 'two' : n100 >= 3 && n100 <= 10 ? 'few' : n100 >= 11 && n100 <= 99 ? 'many' : 'other';
    };
    const as = (n, ord) => {
      if (ord) return n == 1 || n == 5 || n == 7 || n == 8 || n == 9 || n == 10 ? 'one' : n == 2 || n == 3 ? 'two' : n == 4 ? 'few' : n == 6 ? 'many' : 'other';
      return n >= 0 && n <= 1 ? 'one' : 'other';
    };
    const asa = a;
    const ast = d;
    const az = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        i10 = i.slice(-1),
        i100 = i.slice(-2),
        i1000 = i.slice(-3);
      if (ord) return i10 == 1 || i10 == 2 || i10 == 5 || i10 == 7 || i10 == 8 || i100 == 20 || i100 == 50 || i100 == 70 || i100 == 80 ? 'one' : i10 == 3 || i10 == 4 || i1000 == 100 || i1000 == 200 || i1000 == 300 || i1000 == 400 || i1000 == 500 || i1000 == 600 || i1000 == 700 || i1000 == 800 || i1000 == 900 ? 'few' : i == 0 || i10 == 6 || i100 == 40 || i100 == 60 || i100 == 90 ? 'many' : 'other';
      return n == 1 ? 'one' : 'other';
    };
    const bal = (n, ord) => n == 1 ? 'one' : 'other';
    const be = (n, ord) => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2);
      if (ord) return (n10 == 2 || n10 == 3) && n100 != 12 && n100 != 13 ? 'few' : 'other';
      return n10 == 1 && n100 != 11 ? 'one' : n10 >= 2 && n10 <= 4 && (n100 < 12 || n100 > 14) ? 'few' : t0 && n10 == 0 || n10 >= 5 && n10 <= 9 || n100 >= 11 && n100 <= 14 ? 'many' : 'other';
    };
    const bem = a;
    const bez = a;
    const bg = a;
    const bho = b;
    const bm = e;
    const bn = (n, ord) => {
      if (ord) return n == 1 || n == 5 || n == 7 || n == 8 || n == 9 || n == 10 ? 'one' : n == 2 || n == 3 ? 'two' : n == 4 ? 'few' : n == 6 ? 'many' : 'other';
      return n >= 0 && n <= 1 ? 'one' : 'other';
    };
    const bo = e;
    const br = (n, ord) => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2),
        n1000000 = t0 && s[0].slice(-6);
      if (ord) return 'other';
      return n10 == 1 && n100 != 11 && n100 != 71 && n100 != 91 ? 'one' : n10 == 2 && n100 != 12 && n100 != 72 && n100 != 92 ? 'two' : (n10 == 3 || n10 == 4 || n10 == 9) && (n100 < 10 || n100 > 19) && (n100 < 70 || n100 > 79) && (n100 < 90 || n100 > 99) ? 'few' : n != 0 && t0 && n1000000 == 0 ? 'many' : 'other';
    };
    const brx = a;
    const bs = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2),
        f10 = f.slice(-1),
        f100 = f.slice(-2);
      if (ord) return 'other';
      return v0 && i10 == 1 && i100 != 11 || f10 == 1 && f100 != 11 ? 'one' : v0 && i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14) || f10 >= 2 && f10 <= 4 && (f100 < 12 || f100 > 14) ? 'few' : 'other';
    };
    const ca = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i1000000 = i.slice(-6);
      if (ord) return n == 1 || n == 3 ? 'one' : n == 2 ? 'two' : n == 4 ? 'few' : 'other';
      return n == 1 && v0 ? 'one' : i != 0 && i1000000 == 0 && v0 ? 'many' : 'other';
    };
    const ce = a;
    const ceb = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        f10 = f.slice(-1);
      if (ord) return 'other';
      return v0 && (i == 1 || i == 2 || i == 3) || v0 && i10 != 4 && i10 != 6 && i10 != 9 || !v0 && f10 != 4 && f10 != 6 && f10 != 9 ? 'one' : 'other';
    };
    const cgg = a;
    const chr = a;
    const ckb = a;
    const cs = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1];
      if (ord) return 'other';
      return n == 1 && v0 ? 'one' : i >= 2 && i <= 4 && v0 ? 'few' : !v0 ? 'many' : 'other';
    };
    const cy = (n, ord) => {
      if (ord) return n == 0 || n == 7 || n == 8 || n == 9 ? 'zero' : n == 1 ? 'one' : n == 2 ? 'two' : n == 3 || n == 4 ? 'few' : n == 5 || n == 6 ? 'many' : 'other';
      return n == 0 ? 'zero' : n == 1 ? 'one' : n == 2 ? 'two' : n == 3 ? 'few' : n == 6 ? 'many' : 'other';
    };
    const da = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        t0 = Number(s[0]) == n;
      if (ord) return 'other';
      return n == 1 || !t0 && (i == 0 || i == 1) ? 'one' : 'other';
    };
    const de = d;
    const doi = c;
    const dsb = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i100 = i.slice(-2),
        f100 = f.slice(-2);
      if (ord) return 'other';
      return v0 && i100 == 1 || f100 == 1 ? 'one' : v0 && i100 == 2 || f100 == 2 ? 'two' : v0 && (i100 == 3 || i100 == 4) || f100 == 3 || f100 == 4 ? 'few' : 'other';
    };
    const dv = a;
    const dz = e;
    const ee = a;
    const el = a;
    const en = (n, ord) => {
      const s = String(n).split('.'),
        v0 = !s[1],
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2);
      if (ord) return n10 == 1 && n100 != 11 ? 'one' : n10 == 2 && n100 != 12 ? 'two' : n10 == 3 && n100 != 13 ? 'few' : 'other';
      return n == 1 && v0 ? 'one' : 'other';
    };
    const eo = a;
    const es = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i1000000 = i.slice(-6);
      if (ord) return 'other';
      return n == 1 ? 'one' : i != 0 && i1000000 == 0 && v0 ? 'many' : 'other';
    };
    const et = d;
    const eu = a;
    const fa = c;
    const ff = (n, ord) => {
      if (ord) return 'other';
      return n >= 0 && n < 2 ? 'one' : 'other';
    };
    const fi = d;
    const fil = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        f10 = f.slice(-1);
      if (ord) return n == 1 ? 'one' : 'other';
      return v0 && (i == 1 || i == 2 || i == 3) || v0 && i10 != 4 && i10 != 6 && i10 != 9 || !v0 && f10 != 4 && f10 != 6 && f10 != 9 ? 'one' : 'other';
    };
    const fo = a;
    const fr = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i1000000 = i.slice(-6);
      if (ord) return n == 1 ? 'one' : 'other';
      return n >= 0 && n < 2 ? 'one' : i != 0 && i1000000 == 0 && v0 ? 'many' : 'other';
    };
    const fur = a;
    const fy = d;
    const ga = (n, ord) => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n;
      if (ord) return n == 1 ? 'one' : 'other';
      return n == 1 ? 'one' : n == 2 ? 'two' : t0 && n >= 3 && n <= 6 ? 'few' : t0 && n >= 7 && n <= 10 ? 'many' : 'other';
    };
    const gd = (n, ord) => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n;
      if (ord) return n == 1 || n == 11 ? 'one' : n == 2 || n == 12 ? 'two' : n == 3 || n == 13 ? 'few' : 'other';
      return n == 1 || n == 11 ? 'one' : n == 2 || n == 12 ? 'two' : t0 && n >= 3 && n <= 10 || t0 && n >= 13 && n <= 19 ? 'few' : 'other';
    };
    const gl = d;
    const gsw = a;
    const gu = (n, ord) => {
      if (ord) return n == 1 ? 'one' : n == 2 || n == 3 ? 'two' : n == 4 ? 'few' : n == 6 ? 'many' : 'other';
      return n >= 0 && n <= 1 ? 'one' : 'other';
    };
    const guw = b;
    const gv = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2);
      if (ord) return 'other';
      return v0 && i10 == 1 ? 'one' : v0 && i10 == 2 ? 'two' : v0 && (i100 == 0 || i100 == 20 || i100 == 40 || i100 == 60 || i100 == 80) ? 'few' : !v0 ? 'many' : 'other';
    };
    const ha = a;
    const haw = a;
    const he = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1];
      if (ord) return 'other';
      return i == 1 && v0 || i == 0 && !v0 ? 'one' : i == 2 && v0 ? 'two' : 'other';
    };
    const hi = (n, ord) => {
      if (ord) return n == 1 ? 'one' : n == 2 || n == 3 ? 'two' : n == 4 ? 'few' : n == 6 ? 'many' : 'other';
      return n >= 0 && n <= 1 ? 'one' : 'other';
    };
    const hnj = e;
    const hr = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2),
        f10 = f.slice(-1),
        f100 = f.slice(-2);
      if (ord) return 'other';
      return v0 && i10 == 1 && i100 != 11 || f10 == 1 && f100 != 11 ? 'one' : v0 && i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14) || f10 >= 2 && f10 <= 4 && (f100 < 12 || f100 > 14) ? 'few' : 'other';
    };
    const hsb = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i100 = i.slice(-2),
        f100 = f.slice(-2);
      if (ord) return 'other';
      return v0 && i100 == 1 || f100 == 1 ? 'one' : v0 && i100 == 2 || f100 == 2 ? 'two' : v0 && (i100 == 3 || i100 == 4) || f100 == 3 || f100 == 4 ? 'few' : 'other';
    };
    const hu = (n, ord) => {
      if (ord) return n == 1 || n == 5 ? 'one' : 'other';
      return n == 1 ? 'one' : 'other';
    };
    const hy = (n, ord) => {
      if (ord) return n == 1 ? 'one' : 'other';
      return n >= 0 && n < 2 ? 'one' : 'other';
    };
    const ia = d;
    const id = e;
    const ig = e;
    const ii = e;
    const io = d;
    const is = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        t = (s[1] || '').replace(/0+$/, ''),
        t0 = Number(s[0]) == n,
        i10 = i.slice(-1),
        i100 = i.slice(-2);
      if (ord) return 'other';
      return t0 && i10 == 1 && i100 != 11 || t % 10 == 1 && t % 100 != 11 ? 'one' : 'other';
    };
    const it = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i1000000 = i.slice(-6);
      if (ord) return n == 11 || n == 8 || n == 80 || n == 800 ? 'many' : 'other';
      return n == 1 && v0 ? 'one' : i != 0 && i1000000 == 0 && v0 ? 'many' : 'other';
    };
    const iu = f;
    const ja = e;
    const jbo = e;
    const jgo = a;
    const jmc = a;
    const jv = e;
    const jw = e;
    const ka = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        i100 = i.slice(-2);
      if (ord) return i == 1 ? 'one' : i == 0 || i100 >= 2 && i100 <= 20 || i100 == 40 || i100 == 60 || i100 == 80 ? 'many' : 'other';
      return n == 1 ? 'one' : 'other';
    };
    const kab = (n, ord) => {
      if (ord) return 'other';
      return n >= 0 && n < 2 ? 'one' : 'other';
    };
    const kaj = a;
    const kcg = a;
    const kde = e;
    const kea = e;
    const kk = (n, ord) => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1);
      if (ord) return n10 == 6 || n10 == 9 || t0 && n10 == 0 && n != 0 ? 'many' : 'other';
      return n == 1 ? 'one' : 'other';
    };
    const kkj = a;
    const kl = a;
    const km = e;
    const kn = c;
    const ko = e;
    const ks = a;
    const ksb = a;
    const ksh = (n, ord) => {
      if (ord) return 'other';
      return n == 0 ? 'zero' : n == 1 ? 'one' : 'other';
    };
    const ku = a;
    const kw = (n, ord) => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n100 = t0 && s[0].slice(-2),
        n1000 = t0 && s[0].slice(-3),
        n100000 = t0 && s[0].slice(-5),
        n1000000 = t0 && s[0].slice(-6);
      if (ord) return t0 && n >= 1 && n <= 4 || n100 >= 1 && n100 <= 4 || n100 >= 21 && n100 <= 24 || n100 >= 41 && n100 <= 44 || n100 >= 61 && n100 <= 64 || n100 >= 81 && n100 <= 84 ? 'one' : n == 5 || n100 == 5 ? 'many' : 'other';
      return n == 0 ? 'zero' : n == 1 ? 'one' : n100 == 2 || n100 == 22 || n100 == 42 || n100 == 62 || n100 == 82 || t0 && n1000 == 0 && (n100000 >= 1000 && n100000 <= 20000 || n100000 == 40000 || n100000 == 60000 || n100000 == 80000) || n != 0 && n1000000 == 100000 ? 'two' : n100 == 3 || n100 == 23 || n100 == 43 || n100 == 63 || n100 == 83 ? 'few' : n != 1 && (n100 == 1 || n100 == 21 || n100 == 41 || n100 == 61 || n100 == 81) ? 'many' : 'other';
    };
    const ky = a;
    const lag = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0];
      if (ord) return 'other';
      return n == 0 ? 'zero' : (i == 0 || i == 1) && n != 0 ? 'one' : 'other';
    };
    const lb = a;
    const lg = a;
    const lij = (n, ord) => {
      const s = String(n).split('.'),
        v0 = !s[1],
        t0 = Number(s[0]) == n;
      if (ord) return n == 11 || n == 8 || t0 && n >= 80 && n <= 89 || t0 && n >= 800 && n <= 899 ? 'many' : 'other';
      return n == 1 && v0 ? 'one' : 'other';
    };
    const lkt = e;
    const ln = b;
    const lo = (n, ord) => {
      if (ord) return n == 1 ? 'one' : 'other';
      return 'other';
    };
    const lt = (n, ord) => {
      const s = String(n).split('.'),
        f = s[1] || '',
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2);
      if (ord) return 'other';
      return n10 == 1 && (n100 < 11 || n100 > 19) ? 'one' : n10 >= 2 && n10 <= 9 && (n100 < 11 || n100 > 19) ? 'few' : f != 0 ? 'many' : 'other';
    };
    const lv = (n, ord) => {
      const s = String(n).split('.'),
        f = s[1] || '',
        v = f.length,
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2),
        f100 = f.slice(-2),
        f10 = f.slice(-1);
      if (ord) return 'other';
      return t0 && n10 == 0 || n100 >= 11 && n100 <= 19 || v == 2 && f100 >= 11 && f100 <= 19 ? 'zero' : n10 == 1 && n100 != 11 || v == 2 && f10 == 1 && f100 != 11 || v != 2 && f10 == 1 ? 'one' : 'other';
    };
    const mas = a;
    const mg = b;
    const mgo = a;
    const mk = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2),
        f10 = f.slice(-1),
        f100 = f.slice(-2);
      if (ord) return i10 == 1 && i100 != 11 ? 'one' : i10 == 2 && i100 != 12 ? 'two' : (i10 == 7 || i10 == 8) && i100 != 17 && i100 != 18 ? 'many' : 'other';
      return v0 && i10 == 1 && i100 != 11 || f10 == 1 && f100 != 11 ? 'one' : 'other';
    };
    const ml = a;
    const mn = a;
    const mo = (n, ord) => {
      const s = String(n).split('.'),
        v0 = !s[1],
        t0 = Number(s[0]) == n,
        n100 = t0 && s[0].slice(-2);
      if (ord) return n == 1 ? 'one' : 'other';
      return n == 1 && v0 ? 'one' : !v0 || n == 0 || n != 1 && n100 >= 1 && n100 <= 19 ? 'few' : 'other';
    };
    const mr = (n, ord) => {
      if (ord) return n == 1 ? 'one' : n == 2 || n == 3 ? 'two' : n == 4 ? 'few' : 'other';
      return n == 1 ? 'one' : 'other';
    };
    const ms = (n, ord) => {
      if (ord) return n == 1 ? 'one' : 'other';
      return 'other';
    };
    const mt = (n, ord) => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n100 = t0 && s[0].slice(-2);
      if (ord) return 'other';
      return n == 1 ? 'one' : n == 2 ? 'two' : n == 0 || n100 >= 3 && n100 <= 10 ? 'few' : n100 >= 11 && n100 <= 19 ? 'many' : 'other';
    };
    const my = e;
    const nah = a;
    const naq = f;
    const nb = a;
    const nd = a;
    const ne = (n, ord) => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n;
      if (ord) return t0 && n >= 1 && n <= 4 ? 'one' : 'other';
      return n == 1 ? 'one' : 'other';
    };
    const nl = d;
    const nn = a;
    const nnh = a;
    const no = a;
    const nqo = e;
    const nr = a;
    const nso = b;
    const ny = a;
    const nyn = a;
    const om = a;
    const or = (n, ord) => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n;
      if (ord) return n == 1 || n == 5 || t0 && n >= 7 && n <= 9 ? 'one' : n == 2 || n == 3 ? 'two' : n == 4 ? 'few' : n == 6 ? 'many' : 'other';
      return n == 1 ? 'one' : 'other';
    };
    const os = a;
    const osa = e;
    const pa = b;
    const pap = a;
    const pcm = c;
    const pl = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2);
      if (ord) return 'other';
      return n == 1 && v0 ? 'one' : v0 && i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14) ? 'few' : v0 && i != 1 && (i10 == 0 || i10 == 1) || v0 && i10 >= 5 && i10 <= 9 || v0 && i100 >= 12 && i100 <= 14 ? 'many' : 'other';
    };
    const prg = (n, ord) => {
      const s = String(n).split('.'),
        f = s[1] || '',
        v = f.length,
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2),
        f100 = f.slice(-2),
        f10 = f.slice(-1);
      if (ord) return 'other';
      return t0 && n10 == 0 || n100 >= 11 && n100 <= 19 || v == 2 && f100 >= 11 && f100 <= 19 ? 'zero' : n10 == 1 && n100 != 11 || v == 2 && f10 == 1 && f100 != 11 || v != 2 && f10 == 1 ? 'one' : 'other';
    };
    const ps = a;
    const pt = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i1000000 = i.slice(-6);
      if (ord) return 'other';
      return i == 0 || i == 1 ? 'one' : i != 0 && i1000000 == 0 && v0 ? 'many' : 'other';
    };
    const pt_PT = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i1000000 = i.slice(-6);
      if (ord) return 'other';
      return n == 1 && v0 ? 'one' : i != 0 && i1000000 == 0 && v0 ? 'many' : 'other';
    };
    const rm = a;
    const ro = (n, ord) => {
      const s = String(n).split('.'),
        v0 = !s[1],
        t0 = Number(s[0]) == n,
        n100 = t0 && s[0].slice(-2);
      if (ord) return n == 1 ? 'one' : 'other';
      return n == 1 && v0 ? 'one' : !v0 || n == 0 || n != 1 && n100 >= 1 && n100 <= 19 ? 'few' : 'other';
    };
    const rof = a;
    const ru = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2);
      if (ord) return 'other';
      return v0 && i10 == 1 && i100 != 11 ? 'one' : v0 && i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14) ? 'few' : v0 && i10 == 0 || v0 && i10 >= 5 && i10 <= 9 || v0 && i100 >= 11 && i100 <= 14 ? 'many' : 'other';
    };
    const rwk = a;
    const sah = e;
    const saq = a;
    const sat = f;
    const sc = (n, ord) => {
      const s = String(n).split('.'),
        v0 = !s[1];
      if (ord) return n == 11 || n == 8 || n == 80 || n == 800 ? 'many' : 'other';
      return n == 1 && v0 ? 'one' : 'other';
    };
    const scn = (n, ord) => {
      const s = String(n).split('.'),
        v0 = !s[1];
      if (ord) return n == 11 || n == 8 || n == 80 || n == 800 ? 'many' : 'other';
      return n == 1 && v0 ? 'one' : 'other';
    };
    const sd = a;
    const sdh = a;
    const se = f;
    const seh = a;
    const ses = e;
    const sg = e;
    const sh = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2),
        f10 = f.slice(-1),
        f100 = f.slice(-2);
      if (ord) return 'other';
      return v0 && i10 == 1 && i100 != 11 || f10 == 1 && f100 != 11 ? 'one' : v0 && i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14) || f10 >= 2 && f10 <= 4 && (f100 < 12 || f100 > 14) ? 'few' : 'other';
    };
    const shi = (n, ord) => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n;
      if (ord) return 'other';
      return n >= 0 && n <= 1 ? 'one' : t0 && n >= 2 && n <= 10 ? 'few' : 'other';
    };
    const si = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '';
      if (ord) return 'other';
      return n == 0 || n == 1 || i == 0 && f == 1 ? 'one' : 'other';
    };
    const sk = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1];
      if (ord) return 'other';
      return n == 1 && v0 ? 'one' : i >= 2 && i <= 4 && v0 ? 'few' : !v0 ? 'many' : 'other';
    };
    const sl = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i100 = i.slice(-2);
      if (ord) return 'other';
      return v0 && i100 == 1 ? 'one' : v0 && i100 == 2 ? 'two' : v0 && (i100 == 3 || i100 == 4) || !v0 ? 'few' : 'other';
    };
    const sma = f;
    const smi = f;
    const smj = f;
    const smn = f;
    const sms = f;
    const sn = a;
    const so = a;
    const sq = (n, ord) => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2);
      if (ord) return n == 1 ? 'one' : n10 == 4 && n100 != 14 ? 'many' : 'other';
      return n == 1 ? 'one' : 'other';
    };
    const sr = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        i100 = i.slice(-2),
        f10 = f.slice(-1),
        f100 = f.slice(-2);
      if (ord) return 'other';
      return v0 && i10 == 1 && i100 != 11 || f10 == 1 && f100 != 11 ? 'one' : v0 && i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14) || f10 >= 2 && f10 <= 4 && (f100 < 12 || f100 > 14) ? 'few' : 'other';
    };
    const ss = a;
    const ssy = a;
    const st = a;
    const su = e;
    const sv = (n, ord) => {
      const s = String(n).split('.'),
        v0 = !s[1],
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2);
      if (ord) return (n10 == 1 || n10 == 2) && n100 != 11 && n100 != 12 ? 'one' : 'other';
      return n == 1 && v0 ? 'one' : 'other';
    };
    const sw = d;
    const syr = a;
    const ta = a;
    const te = a;
    const teo = a;
    const th = e;
    const ti = b;
    const tig = a;
    const tk = (n, ord) => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1);
      if (ord) return n10 == 6 || n10 == 9 || n == 10 ? 'few' : 'other';
      return n == 1 ? 'one' : 'other';
    };
    const tl = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        f = s[1] || '',
        v0 = !s[1],
        i10 = i.slice(-1),
        f10 = f.slice(-1);
      if (ord) return n == 1 ? 'one' : 'other';
      return v0 && (i == 1 || i == 2 || i == 3) || v0 && i10 != 4 && i10 != 6 && i10 != 9 || !v0 && f10 != 4 && f10 != 6 && f10 != 9 ? 'one' : 'other';
    };
    const tn = a;
    const to = e;
    const tpi = e;
    const tr = a;
    const ts = a;
    const tzm = (n, ord) => {
      const s = String(n).split('.'),
        t0 = Number(s[0]) == n;
      if (ord) return 'other';
      return n == 0 || n == 1 || t0 && n >= 11 && n <= 99 ? 'one' : 'other';
    };
    const ug = a;
    const uk = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        t0 = Number(s[0]) == n,
        n10 = t0 && s[0].slice(-1),
        n100 = t0 && s[0].slice(-2),
        i10 = i.slice(-1),
        i100 = i.slice(-2);
      if (ord) return n10 == 3 && n100 != 13 ? 'few' : 'other';
      return v0 && i10 == 1 && i100 != 11 ? 'one' : v0 && i10 >= 2 && i10 <= 4 && (i100 < 12 || i100 > 14) ? 'few' : v0 && i10 == 0 || v0 && i10 >= 5 && i10 <= 9 || v0 && i100 >= 11 && i100 <= 14 ? 'many' : 'other';
    };
    const und = e;
    const ur = d;
    const uz = a;
    const ve = a;
    const vec = (n, ord) => {
      const s = String(n).split('.'),
        i = s[0],
        v0 = !s[1],
        i1000000 = i.slice(-6);
      if (ord) return n == 11 || n == 8 || n == 80 || n == 800 ? 'many' : 'other';
      return n == 1 && v0 ? 'one' : i != 0 && i1000000 == 0 && v0 ? 'many' : 'other';
    };
    const vi = (n, ord) => {
      if (ord) return n == 1 ? 'one' : 'other';
      return 'other';
    };
    const vo = a;
    const vun = a;
    const wa = b;
    const wae = a;
    const wo = e;
    const xh = a;
    const xog = a;
    const yi = d;
    const yo = e;
    const yue = e;
    const zh = e;
    const zu = c;

    var Plurals = /*#__PURE__*/Object.freeze({
        __proto__: null,
        af: af,
        ak: ak,
        am: am,
        an: an,
        ar: ar,
        ars: ars,
        as: as,
        asa: asa,
        ast: ast,
        az: az,
        bal: bal,
        be: be,
        bem: bem,
        bez: bez,
        bg: bg,
        bho: bho,
        bm: bm,
        bn: bn,
        bo: bo,
        br: br,
        brx: brx,
        bs: bs,
        ca: ca,
        ce: ce,
        ceb: ceb,
        cgg: cgg,
        chr: chr,
        ckb: ckb,
        cs: cs,
        cy: cy,
        da: da,
        de: de,
        doi: doi,
        dsb: dsb,
        dv: dv,
        dz: dz,
        ee: ee,
        el: el,
        en: en,
        eo: eo,
        es: es,
        et: et,
        eu: eu,
        fa: fa,
        ff: ff,
        fi: fi,
        fil: fil,
        fo: fo,
        fr: fr,
        fur: fur,
        fy: fy,
        ga: ga,
        gd: gd,
        gl: gl,
        gsw: gsw,
        gu: gu,
        guw: guw,
        gv: gv,
        ha: ha,
        haw: haw,
        he: he,
        hi: hi,
        hnj: hnj,
        hr: hr,
        hsb: hsb,
        hu: hu,
        hy: hy,
        ia: ia,
        id: id,
        ig: ig,
        ii: ii,
        io: io,
        is: is,
        it: it,
        iu: iu,
        ja: ja,
        jbo: jbo,
        jgo: jgo,
        jmc: jmc,
        jv: jv,
        jw: jw,
        ka: ka,
        kab: kab,
        kaj: kaj,
        kcg: kcg,
        kde: kde,
        kea: kea,
        kk: kk,
        kkj: kkj,
        kl: kl,
        km: km,
        kn: kn,
        ko: ko,
        ks: ks,
        ksb: ksb,
        ksh: ksh,
        ku: ku,
        kw: kw,
        ky: ky,
        lag: lag,
        lb: lb,
        lg: lg,
        lij: lij,
        lkt: lkt,
        ln: ln,
        lo: lo,
        lt: lt,
        lv: lv,
        mas: mas,
        mg: mg,
        mgo: mgo,
        mk: mk,
        ml: ml,
        mn: mn,
        mo: mo,
        mr: mr,
        ms: ms,
        mt: mt,
        my: my,
        nah: nah,
        naq: naq,
        nb: nb,
        nd: nd,
        ne: ne,
        nl: nl,
        nn: nn,
        nnh: nnh,
        no: no,
        nqo: nqo,
        nr: nr,
        nso: nso,
        ny: ny,
        nyn: nyn,
        om: om,
        or: or,
        os: os,
        osa: osa,
        pa: pa,
        pap: pap,
        pcm: pcm,
        pl: pl,
        prg: prg,
        ps: ps,
        pt: pt,
        pt_PT: pt_PT,
        rm: rm,
        ro: ro,
        rof: rof,
        ru: ru,
        rwk: rwk,
        sah: sah,
        saq: saq,
        sat: sat,
        sc: sc,
        scn: scn,
        sd: sd,
        sdh: sdh,
        se: se,
        seh: seh,
        ses: ses,
        sg: sg,
        sh: sh,
        shi: shi,
        si: si,
        sk: sk,
        sl: sl,
        sma: sma,
        smi: smi,
        smj: smj,
        smn: smn,
        sms: sms,
        sn: sn,
        so: so,
        sq: sq,
        sr: sr,
        ss: ss,
        ssy: ssy,
        st: st,
        su: su,
        sv: sv,
        sw: sw,
        syr: syr,
        ta: ta,
        te: te,
        teo: teo,
        th: th,
        ti: ti,
        tig: tig,
        tk: tk,
        tl: tl,
        tn: tn,
        to: to,
        tpi: tpi,
        tr: tr,
        ts: ts,
        tzm: tzm,
        ug: ug,
        uk: uk,
        und: und,
        ur: ur,
        uz: uz,
        ve: ve,
        vec: vec,
        vi: vi,
        vo: vo,
        vun: vun,
        wa: wa,
        wae: wae,
        wo: wo,
        xh: xh,
        xog: xog,
        yi: yi,
        yo: yo,
        yue: yue,
        zh: zh,
        zu: zu
    });

    function normalize(locale) {
        if (typeof locale !== 'string' || locale.length < 2) {
            throw new RangeError("Invalid language tag: ".concat(locale));
        }
        if (locale.startsWith('pt-PT'))
            return 'pt-PT';
        var m = locale.match(/.+?(?=[-_])/);
        return m ? m[0] : locale;
    }
    function getPlural(locale) {
        if (typeof locale === 'function') {
            var lc_1 = normalize(locale.name);
            return {
                isDefault: false,
                id: identifier(lc_1),
                lc: lc_1,
                locale: locale.name,
                getPlural: locale,
                cardinals: locale.cardinals || [],
                ordinals: locale.ordinals || []
            };
        }
        var lc = normalize(locale);
        var id = identifier(lc);
        if (isPluralId(id)) {
            return {
                isDefault: true,
                id: id,
                lc: lc,
                locale: locale,
                getCardinal: Cardinals[id],
                getPlural: Plurals[id],
                cardinals: PluralCategories[id].cardinal,
                ordinals: PluralCategories[id].ordinal
            };
        }
        return null;
    }
    function getAllPlurals(firstLocale) {
        var keys = Object.keys(Plurals).filter(function (key) { return key !== firstLocale; });
        keys.unshift(firstLocale);
        return keys.map(getPlural);
    }
    function hasPlural(locale) {
        var lc = normalize(locale);
        return identifier(lc) in Plurals;
    }
    function isPluralId(id) {
        return id in Plurals;
    }

    var MessageFormat = (function () {
        function MessageFormat(locale, options) {
            this.plurals = [];
            this.options = Object.assign({
                biDiSupport: false,
                currency: 'USD',
                customFormatters: {},
                localeCodeFromKey: null,
                requireAllArguments: false,
                returnType: 'string',
                strict: (options && options.strictNumberSign) || false,
                strictPluralKeys: true
            }, options);
            if (locale === '*') {
                this.plurals = getAllPlurals(MessageFormat.defaultLocale);
            }
            else if (Array.isArray(locale)) {
                this.plurals = locale.map(getPlural).filter(Boolean);
            }
            else if (locale) {
                var pl = getPlural(locale);
                if (pl)
                    this.plurals = [pl];
            }
            if (this.plurals.length === 0) {
                var pl = getPlural(MessageFormat.defaultLocale);
                this.plurals = [pl];
            }
        }
        MessageFormat.escape = function (str, octothorpe) {
            var esc = octothorpe ? /[#{}]/g : /[{}]/g;
            return String(str).replace(esc, "'$&'");
        };
        MessageFormat.supportedLocalesOf = function (locales) {
            var la = Array.isArray(locales) ? locales : [locales];
            return la.filter(hasPlural);
        };
        MessageFormat.prototype.resolvedOptions = function () {
            return __assign(__assign({}, this.options), { locale: this.plurals[0].locale, plurals: this.plurals });
        };
        MessageFormat.prototype.compile = function (message) {
            var e_1, _a;
            var compiler = new Compiler(this.options);
            var fnBody = 'return ' + compiler.compile(message, this.plurals[0]);
            var nfArgs = [];
            var fnArgs = [];
            try {
                for (var _b = __values(Object.entries(compiler.runtime)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = __read(_c.value, 2), key = _d[0], fmt = _d[1];
                    nfArgs.push(key);
                    fnArgs.push(fmt);
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            var fn = new (Function.bind.apply(Function, __spreadArray(__spreadArray([void 0], __read(nfArgs), false), [fnBody], false)))();
            return fn.apply(void 0, __spreadArray([], __read(fnArgs), false));
        };
        MessageFormat.defaultLocale = 'en';
        return MessageFormat;
    }());

    return MessageFormat;

}));
