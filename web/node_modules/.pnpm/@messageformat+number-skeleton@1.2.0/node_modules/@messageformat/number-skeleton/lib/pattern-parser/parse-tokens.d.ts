import { AffixToken } from './affix-tokens.js';
import { NumberToken } from './number-tokens.js';
import { PatternError } from '../errors.js';
export declare function parseTokens(src: string, onError: (err: PatternError) => void): {
    tokens: {
        prefix: AffixToken[];
        number: NumberToken[];
        suffix: AffixToken[];
    };
    negative: {
        prefix: AffixToken[];
        number: NumberToken[];
        suffix: AffixToken[];
    };
} | {
    tokens: {
        prefix: AffixToken[];
        number: NumberToken[];
        suffix: AffixToken[];
    };
    negative?: undefined;
};
