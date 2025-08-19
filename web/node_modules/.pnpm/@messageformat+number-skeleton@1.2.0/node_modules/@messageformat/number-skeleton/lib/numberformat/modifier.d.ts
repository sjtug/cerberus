import { Skeleton } from '../types/skeleton.js';
/**
 * Determine a modifier for the input value to account for any `scale`,
 * `percent`, and `precision-increment` tokens in the skeleton.
 *
 * @internal
 * @remarks
 * With ICU NumberFormatter, the `percent` skeleton would style `25` as "25%".
 * To achieve the same with `Intl.NumberFormat`, the input value must be `0.25`.
 */
export declare function getNumberFormatModifier(skeleton: Skeleton): (n: number) => number;
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
export declare function getNumberFormatModifierSource(skeleton: Skeleton): string | null;
