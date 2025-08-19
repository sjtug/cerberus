'use strict';

var Compiler = require('./compiler');
var Cardinals = require('make-plural/cardinals');
var PluralCategories = require('make-plural/pluralCategories');
var Plurals = require('make-plural/plurals');
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

var Cardinals__namespace = /*#__PURE__*/_interopNamespaceDefault(Cardinals);
var PluralCategories__namespace = /*#__PURE__*/_interopNamespaceDefault(PluralCategories);
var Plurals__namespace = /*#__PURE__*/_interopNamespaceDefault(Plurals);

function normalize(locale) {
    if (typeof locale !== 'string' || locale.length < 2) {
        throw new RangeError(`Invalid language tag: ${locale}`);
    }
    if (locale.startsWith('pt-PT'))
        return 'pt-PT';
    const m = locale.match(/.+?(?=[-_])/);
    return m ? m[0] : locale;
}
function getPlural(locale) {
    if (typeof locale === 'function') {
        const lc = normalize(locale.name);
        return {
            isDefault: false,
            id: safeIdentifier.identifier(lc),
            lc,
            locale: locale.name,
            getPlural: locale,
            cardinals: locale.cardinals || [],
            ordinals: locale.ordinals || []
        };
    }
    const lc = normalize(locale);
    const id = safeIdentifier.identifier(lc);
    if (isPluralId(id)) {
        return {
            isDefault: true,
            id,
            lc,
            locale,
            getCardinal: Cardinals__namespace[id],
            getPlural: Plurals__namespace[id],
            cardinals: PluralCategories__namespace[id].cardinal,
            ordinals: PluralCategories__namespace[id].ordinal
        };
    }
    return null;
}
function getAllPlurals(firstLocale) {
    const keys = Object.keys(Plurals__namespace).filter(key => key !== firstLocale);
    keys.unshift(firstLocale);
    return keys.map(getPlural);
}
function hasPlural(locale) {
    const lc = normalize(locale);
    return safeIdentifier.identifier(lc) in Plurals__namespace;
}
function isPluralId(id) {
    return id in Plurals__namespace;
}

class MessageFormat {
    static escape(str, octothorpe) {
        const esc = octothorpe ? /[#{}]/g : /[{}]/g;
        return String(str).replace(esc, "'$&'");
    }
    static supportedLocalesOf(locales) {
        const la = Array.isArray(locales) ? locales : [locales];
        return la.filter(hasPlural);
    }
    constructor(locale, options) {
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
            const pl = getPlural(locale);
            if (pl)
                this.plurals = [pl];
        }
        if (this.plurals.length === 0) {
            const pl = getPlural(MessageFormat.defaultLocale);
            this.plurals = [pl];
        }
    }
    resolvedOptions() {
        return Object.assign(Object.assign({}, this.options), { locale: this.plurals[0].locale, plurals: this.plurals });
    }
    compile(message) {
        const compiler = new Compiler(this.options);
        const fnBody = 'return ' + compiler.compile(message, this.plurals[0]);
        const nfArgs = [];
        const fnArgs = [];
        for (const [key, fmt] of Object.entries(compiler.runtime)) {
            nfArgs.push(key);
            fnArgs.push(fmt);
        }
        const fn = new Function(...nfArgs, fnBody);
        return fn(...fnArgs);
    }
}
MessageFormat.defaultLocale = 'en';

module.exports = MessageFormat;
