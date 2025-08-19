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
import { Token as LexerToken } from 'moo';
/** @internal */
export type Token = Content | PlainArg | FunctionArg | Select | Octothorpe;
/**
 * Text content of the message
 *
 * @public
 */
export interface Content {
    type: 'content';
    value: string;
    ctx: Context;
}
/**
 * A simple placeholder
 *
 * @public
 * @remarks
 * `arg` identifies an input variable, the value of which is used directly in the output.
 */
export interface PlainArg {
    type: 'argument';
    arg: string;
    ctx: Context;
}
/**
 * A placeholder for a mapped argument
 *
 * @public
 * @remarks
 * `arg` identifies an input variable, the value of which is passed to the function identified by `key`, with `param` as an optional argument.
 * The output of the function is used in the output.
 *
 * In strict mode, `param` (if defined) may only be an array containing one {@link Content} token.
 */
export interface FunctionArg {
    type: 'function';
    arg: string;
    key: string;
    param?: Array<Content | PlainArg | FunctionArg | Select | Octothorpe>;
    ctx: Context;
}
/**
 * A selector between multiple variants
 *
 * @public
 * @remarks
 * The value of the `arg` input variable determines which of the `cases` is used as the output value of this placeholder.
 *
 * For `plural` and `selectordinal`, the value of `arg` is expected to be numeric, and will be matched either to an exact case with a key like `=3`,
 * or to a case with a key that has a matching plural category as the input number.
 */
export interface Select {
    type: 'plural' | 'select' | 'selectordinal';
    arg: string;
    cases: SelectCase[];
    pluralOffset?: number;
    ctx: Context;
}
/**
 * A case within a {@link Select}
 *
 * @public
 */
export interface SelectCase {
    key: string;
    tokens: Array<Content | PlainArg | FunctionArg | Select | Octothorpe>;
    ctx: Context;
}
/**
 * Represents the `#` character
 *
 * @public
 * @remarks
 * Within a `plural` or `selectordinal` {@link Select}, the `#` character should be replaced with a formatted representation of the Select's input value.
 */
export interface Octothorpe {
    type: 'octothorpe';
    ctx: Context;
}
/**
 * The parsing context for a token
 *
 * @public
 */
export interface Context {
    /** Token start index from the beginning of the input string */
    offset: number;
    /** Token start line number, starting from 1 */
    line: number;
    /** Token start column, starting from 1 */
    col: number;
    /** The raw input source for the token */
    text: string;
    /** The number of line breaks consumed while parsing the token */
    lineBreaks: number;
}
/**
 * Thrown by {@link parse} on error
 *
 * @public
 */
export declare class ParseError extends Error {
    /** @internal */
    constructor(lt: LexerToken | null, msg: string);
}
/**
 * One of the valid {@link http://cldr.unicode.org/index/cldr-spec/plural-rules | Unicode CLDR} plural category keys
 *
 * @public
 */
export type PluralCategory = 'zero' | 'one' | 'two' | 'few' | 'many' | 'other';
/**
 * Options for the parser
 *
 * @public
 */
export interface ParseOptions {
    /**
     * Array of valid plural categories for the current locale, used to validate `plural` keys.
     *
     * If undefined, the full set of valid {@link PluralCategory} keys is used.
     * To disable this check, pass in an empty array.
     */
    cardinal?: PluralCategory[];
    /**
     * Array of valid plural categories for the current locale, used to validate `selectordinal` keys.
     *
     * If undefined, the full set of valid {@link PluralCategory} keys is used.
     * To disable this check, pass in an empty array.
     */
    ordinal?: PluralCategory[];
    /**
     * By default, the parsing applies a few relaxations to the ICU MessageFormat spec.
     * Setting `strict: true` will disable these relaxations.
     *
     * @remarks
     * - The `argType` of `simpleArg` formatting functions will be restricted to the set of
     *   `number`, `date`, `time`, `spellout`, `ordinal`, and `duration`,
     *   rather than accepting any lower-case identifier that does not start with a number.
     *
     * - The optional `argStyle` of `simpleArg` formatting functions will not be parsed as any other text, but instead as the spec requires:
     *   "In argStyleText, every single ASCII apostrophe begins and ends quoted literal text, and unquoted \{curly braces\} must occur in matched pairs."
     *
     * - Inside a `plural` or `selectordinal` statement, a pound symbol (`#`) is replaced with the input number.
     *   By default, `#` is also parsed as a special character in nested statements too, and can be escaped using apostrophes (`'#'`).
     *   In strict mode `#` will be parsed as a special character only directly inside a `plural` or `selectordinal` statement.
     *   Outside those, `#` and `'#'` will be parsed as literal text.
     */
    strict?: boolean;
    /**
     * By default, the parser will reject any plural keys that are not valid
     * {@link http://cldr.unicode.org/index/cldr-spec/plural-rules | Unicode CLDR}
     * plural category keys.
     * Setting `strictPluralKeys: false` will disable this check.
     */
    strictPluralKeys?: boolean;
}
/**
 * Parse an input string into an array of tokens
 *
 * @public
 * @remarks
 * The parser only supports the default `DOUBLE_OPTIONAL`
 * {@link http://www.icu-project.org/apiref/icu4c/messagepattern_8h.html#af6e0757e0eb81c980b01ee5d68a9978b | apostrophe mode}.
 */
export declare function parse(src: string, options?: ParseOptions): Array<Content | PlainArg | FunctionArg | Select>;
