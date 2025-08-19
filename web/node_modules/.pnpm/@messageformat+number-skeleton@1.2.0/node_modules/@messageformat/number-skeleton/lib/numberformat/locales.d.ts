import { Skeleton } from '../types/skeleton.js';
/**
 * Add
 * {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Intl#Locale_identification_and_negotiation | numbering-system tags}
 * to locale identifiers
 *
 * @internal
 */
export declare function getNumberFormatLocales(locales: string | string[], { numberingSystem }: Skeleton): string[];
