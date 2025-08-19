import { PatternError } from '../errors.js';
export type AffixToken = {
    char: '%';
    width: number;
    style: 'percent' | 'permille';
} | {
    char: '¤';
    width: number;
    currency: 'default' | 'iso-code' | 'full-name' | 'narrow';
} | {
    char: '*';
    width: number;
    pad: string;
} | {
    char: '+' | '-';
    width: number;
} | {
    char: "'";
    width: number;
    str: string;
};
export declare function parseAffixToken(src: string, pos: number, onError: (err: PatternError) => void): AffixToken | null;
