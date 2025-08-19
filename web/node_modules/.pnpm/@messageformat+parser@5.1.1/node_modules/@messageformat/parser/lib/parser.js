"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParseError = void 0;
exports.parse = parse;
const lexer_js_1 = require("./lexer.js");
const getContext = (lt) => ({
    offset: lt.offset,
    line: lt.line,
    col: lt.col,
    text: lt.text,
    lineBreaks: lt.lineBreaks
});
const isSelectType = (type) => type === 'plural' || type === 'select' || type === 'selectordinal';
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
        ctx: Object.assign({}, param[0].ctx, { text })
    };
    return [c];
}
const strictArgTypes = [
    'number',
    'date',
    'time',
    'spellout',
    'ordinal',
    'duration'
];
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
exports.ParseError = ParseError;
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
        }
        else if (type !== 'select') {
            const keys = type === 'plural' ? this.cardinalKeys : this.ordinalKeys;
            if (this.strictPluralKeys && keys.length > 0 && !keys.includes(key)) {
                const msg = `The ${type} case ${key} is not valid in this locale`;
                throw new ParseError(lt, msg);
            }
        }
    }
    parseSelect({ value: arg }, inPlural, ctx, type) {
        const sel = { type, arg, cases: [], ctx };
        if (type === 'plural' || type === 'selectordinal')
            inPlural = true;
        else if (this.strict)
            inPlural = false;
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
                case 'case': {
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
        if (!argType)
            throw new ParseError(null, 'Unexpected message end');
        ctx.text += argType.text;
        ctx.lineBreaks += argType.lineBreaks;
        if (this.strict &&
            (argType.type === 'func-simple' || argType.type === 'func-args') &&
            !strictArgTypes.includes(argType.value)) {
            const msg = `Invalid strict mode function arg type: ${argType.value}`;
            throw new ParseError(lt, msg);
        }
        switch (argType.type) {
            case 'end':
                return { type: 'argument', arg: lt.value, ctx };
            case 'func-simple': {
                const end = this.lexer.next();
                if (!end)
                    throw new ParseError(null, 'Unexpected message end');
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
            case 'func-args': {
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
                }
                else {
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
                if (content)
                    content = null;
                tokens.push(this.parseArgToken(lt, inPlural));
            }
            else if (lt.type === 'octothorpe' && inPlural) {
                if (content)
                    content = null;
                tokens.push({ type: 'octothorpe', ctx: getContext(lt) });
            }
            else if (lt.type === 'end' && !atRoot) {
                return tokens;
            }
            else {
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
                }
                else {
                    content = { type: 'content', value, ctx: getContext(lt) };
                    tokens.push(content);
                }
            }
        }
        if (atRoot)
            return tokens;
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
function parse(src, options = {}) {
    const parser = new Parser(src, options);
    return parser.parse();
}
