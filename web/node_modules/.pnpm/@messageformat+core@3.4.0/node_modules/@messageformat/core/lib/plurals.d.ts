import * as Plurals from 'make-plural/plurals';
/**
 * Function used to define the pluralisation for a locale
 *
 * @public
 * @remarks
 * `(value: number | string, ord?: boolean) => PluralCateogry`
 *
 * May be used as a {@link MessageFormat} constructor `locale` argument.
 */
export interface PluralFunction {
    /** Foo bar */
    (value: number | string, ord?: boolean): Plurals.PluralCategory;
    /** Which plurals may be returned if `ord` is falsy */
    cardinals?: Plurals.PluralCategory[];
    /** Which plurals may be returned if `ord` is true */
    ordinals?: Plurals.PluralCategory[];
    /** The name of the module from which this function may be imported */
    module?: string;
}
export interface PluralObject {
    isDefault: boolean;
    id: string;
    lc: string;
    locale: string;
    getCardinal?: (value: string | number) => Plurals.PluralCategory;
    getPlural: PluralFunction;
    cardinals: Plurals.PluralCategory[];
    ordinals: Plurals.PluralCategory[];
}
export declare function getPlural(locale: string | PluralFunction): PluralObject | null;
export declare function getAllPlurals(firstLocale: string): PluralObject[];
export declare function hasPlural(locale: string): boolean;
