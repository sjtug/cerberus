import { NumberFormatError } from '../errors.js';
export declare function parsePrecisionBlueprint(stem: string, options: string[], onError: (err: NumberFormatError) => void): {
    style: "precision-fraction";
    minFraction?: number | undefined;
    maxFraction?: number | undefined;
    minSignificant?: number | undefined;
    maxSignificant?: number | undefined;
    source?: string | undefined;
} | null;
