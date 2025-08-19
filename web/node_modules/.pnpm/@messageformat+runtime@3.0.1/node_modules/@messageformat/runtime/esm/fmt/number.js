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
    if (!_nf[key])
        _nf[key] = new Intl.NumberFormat(lc, opt);
    return _nf[key];
}
export function numberFmt(value, lc, arg, defaultCurrency) {
    var _a = (arg && arg.split(':')) || [], type = _a[0], currency = _a[1];
    var opt = {
        integer: { maximumFractionDigits: 0 },
        percent: { style: 'percent' },
        currency: {
            style: 'currency',
            currency: (currency && currency.trim()) || defaultCurrency,
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    };
    return nf(lc, opt[type] || {}).format(value);
}
export var numberCurrency = function (value, lc, arg) {
    return nf(lc, {
        style: 'currency',
        currency: arg,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
};
export var numberInteger = function (value, lc) {
    return nf(lc, { maximumFractionDigits: 0 }).format(value);
};
export var numberPercent = function (value, lc) {
    return nf(lc, { style: 'percent' }).format(value);
};
