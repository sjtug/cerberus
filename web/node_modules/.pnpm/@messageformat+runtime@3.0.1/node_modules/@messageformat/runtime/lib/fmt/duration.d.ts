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
export declare function duration(value: number | string): string;
