import { FunctionArg, Select, Token } from '@messageformat/parser';
import { MessageFormatOptionsWithDefaults } from './messageformat';
import { PluralObject } from './plurals';
type RuntimeType = 'formatter' | 'locale' | 'runtime';
interface RuntimeEntry {
    (...args: any[]): unknown;
    id?: string | null;
    module?: string | null;
    toString?: () => string;
    type?: RuntimeType;
}
export interface RuntimeMap {
    [key: string]: Required<RuntimeEntry>;
}
/**
 * A hierarchical structure of ICU MessageFormat strings
 *
 * @public
 * @remarks
 * Used in {@link compileModule} arguments
 */
export interface StringStructure {
    [key: string]: StringStructure | string;
}
export default class Compiler {
    arguments: string[];
    options: MessageFormatOptionsWithDefaults;
    plural: PluralObject;
    runtime: RuntimeMap;
    constructor(options: MessageFormatOptionsWithDefaults);
    /**
     * Recursively compile a string or a tree of strings to JavaScript function
     * sources
     *
     * If `src` is an object with a key that is also present in `plurals`, the key
     * in question will be used as the locale identifier for its value. To disable
     * the compile-time checks for plural & selectordinal keys while maintaining
     * multi-locale support, use falsy values in `plurals`.
     *
     * @param src - The source for which the JS code should be generated
     * @param plural - The default locale
     * @param plurals - A map of pluralization keys for all available locales
     */
    compile(src: string | StringStructure, plural: PluralObject, plurals?: {
        [key: string]: PluralObject;
    }): string | StringStructure;
    cases(token: Select, pluralToken: Select | null): string;
    concatenate(tokens: string[], root: boolean): string;
    token(token: Token, pluralToken: Select | null): string;
    runtimeIncludes(key: string, type: RuntimeType): Required<RuntimeEntry>;
    setLocale(key: string, ord: boolean): void;
    setRuntimeFn(key: 'number' | 'plural' | 'select' | 'strictNumber' | 'reqArgs'): void;
    getFormatterArg({ key, param }: FunctionArg, pluralToken: Select | null): string | null;
    setFormatter(key: string, parentKey?: string): void;
    setDateFormatter({ param }: FunctionArg, args: (number | string)[], plural: Select | null): string;
    setNumberFormatter({ param }: FunctionArg, args: (number | string)[], plural: Select | null): string;
}
export {};
