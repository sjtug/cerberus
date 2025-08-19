// FIXME: subtype is not checked
/** @internal */
export function isUnit(unit) {
    const types = [
        'acceleration',
        'angle',
        'area',
        'concentr',
        'consumption',
        'digital',
        'duration',
        'electric',
        'energy',
        'force',
        'frequency',
        'graphics',
        'length',
        'light',
        'mass',
        'power',
        'pressure',
        'speed',
        'temperature',
        'torque',
        'volume'
    ];
    const [type] = unit.split('-', 1);
    return types.indexOf(type) !== -1;
}
