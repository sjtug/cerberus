/** @internal */
export function isNumberingSystem(ns) {
    const systems = [
        'arab',
        'arabext',
        'bali',
        'beng',
        'deva',
        'fullwide',
        'gujr',
        'guru',
        'hanidec',
        'khmr',
        'knda',
        'laoo',
        'latn',
        'limb',
        'mlym',
        'mong',
        'mymr',
        'orya',
        'tamldec',
        'telu',
        'thai',
        'tibt'
    ];
    return systems.indexOf(ns) !== -1;
}
