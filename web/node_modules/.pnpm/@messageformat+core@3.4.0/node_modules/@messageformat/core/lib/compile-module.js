'use strict';

var safeIdentifier = require('safe-identifier');
var Compiler = require('./compiler');

function stringifyRuntime(runtime) {
    const imports = {};
    const vars = {};
    for (const [name, fn] of Object.entries(runtime)) {
        if (fn.module) {
            const alias = fn.id && fn.id !== name ? `${fn.id} as ${name}` : name;
            const prev = imports[fn.module];
            imports[fn.module] = prev ? [...prev, alias] : [alias];
        }
        else {
            vars[name] = String(fn);
        }
    }
    const is = Object.entries(imports).map(([module, names]) => `import { ${names.sort().join(', ')} } from ${JSON.stringify(module)};`);
    const vs = Object.entries(vars).map(([id, value]) => new RegExp(`^function ${id}\\b`).test(value)
        ? value
        : `const ${id} = ${value};`);
    if (is.length > 0 && vs.length > 0)
        is.push('');
    return is.concat(vs).join('\n');
}
function stringifyObject(obj, level = 0) {
    if (typeof obj !== 'object')
        return obj;
    const indent = '  '.repeat(level);
    const o = Object.keys(obj).map(key => {
        const v = stringifyObject(obj[key], level + 1);
        return `\n${indent}  ${safeIdentifier.property(null, key)}: ${v}`;
    });
    return `{${o.join(',')}\n${indent}}`;
}
function compileModule(messageformat, messages) {
    const { plurals } = messageformat;
    const cp = {};
    if (plurals.length > 1) {
        for (const pl of plurals)
            cp[pl.lc] = cp[pl.locale] = pl;
    }
    const compiler = new Compiler(messageformat.options);
    const msgObj = compiler.compile(messages, plurals[0], cp);
    const msgStr = stringifyObject(msgObj);
    const rtStr = stringifyRuntime(compiler.runtime);
    return `${rtStr}\nexport default ${msgStr}`;
}

module.exports = compileModule;
