export type NumberToken = {
    char: '.';
    width: number;
} | {
    char: '#';
    width: number;
} | {
    char: ',';
    width: number;
} | {
    char: '0';
    width: number;
    digits: string;
} | {
    char: '@';
    width: number;
    min: number;
} | {
    char: 'E';
    width: number;
    expDigits: number;
    plus: boolean;
};
export declare function parseNumberToken(src: string, pos: number): NumberToken | null;
