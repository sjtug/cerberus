import { BadOptionError, TooManyOptionsError } from '../errors.js';
function parseBlueprintDigits(src, style) {
    const re = style === 'fraction' ? /^\.(0*)(\+|#*)$/ : /^(@+)(\+|#*)$/;
    const match = src && src.match(re);
    if (match) {
        const min = match[1].length;
        switch (match[2].charAt(0)) {
            case '':
                return { min, max: min };
            case '+':
                return { min, max: null };
            case '#': {
                return { min, max: min + match[2].length };
            }
        }
    }
    return null;
}
export function parsePrecisionBlueprint(stem, options, onError) {
    const fd = parseBlueprintDigits(stem, 'fraction');
    if (fd) {
        if (options.length > 1)
            onError(new TooManyOptionsError(stem, options, 1));
        const res = {
            style: 'precision-fraction',
            source: stem,
            minFraction: fd.min
        };
        if (fd.max != null)
            res.maxFraction = fd.max;
        const option = options[0];
        const sd = parseBlueprintDigits(option, 'significant');
        if (sd) {
            res.source = `${stem}/${option}`;
            res.minSignificant = sd.min;
            if (sd.max != null)
                res.maxSignificant = sd.max;
        }
        else if (option)
            onError(new BadOptionError(stem, option));
        return res;
    }
    const sd = parseBlueprintDigits(stem, 'significant');
    if (sd) {
        for (const opt of options)
            onError(new BadOptionError(stem, opt));
        const res = {
            style: 'precision-fraction',
            source: stem,
            minSignificant: sd.min
        };
        if (sd.max != null)
            res.maxSignificant = sd.max;
        return res;
    }
    return null;
}
