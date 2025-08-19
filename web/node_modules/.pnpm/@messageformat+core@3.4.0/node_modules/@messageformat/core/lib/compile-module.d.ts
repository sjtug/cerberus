import { StringStructure } from './compiler';
import MessageFormat, { MessageFunction } from './messageformat';
export { MessageFunction, StringStructure };
/**
 * The type of the generated ES module, once executed
 *
 * @public
 * @remarks
 * Use with `Shape` extending the {@link StringStructure} that was used as
 * the module source.
 */
export type MessageModule<Shape, ReturnType extends 'string' | 'values' = 'string'> = Shape extends string ? MessageFunction<ReturnType> : {
    [P in keyof Shape]: MessageModule<Shape[P], ReturnType>;
};
/**
 * Compile a collection of messages into an ES module
 *
 * @public
 * @remarks
 * Available as the default export of `'@messageformat/core/compile-module'`, to
 * allow for its exclusion from browser builds.
 *
 * With `messages` as a hierarchical structure of ICU MessageFormat strings,
 * the output of `compileModule()` will be the source code of an ES module with
 * a default export matching the input structure, with each string replaced by
 * its corresponding JS function. If the input includes anything other than
 * simple variable replacements, the output ES module will have a dependency on
 * `'@messageformat/runtime'`.
 *
 * If the `messageformat` instance has been initialized with support for more
 * than one locale, using a key that matches the locale's identifier at any
 * depth of a `messages` object will set its child elements to use that locale.
 * To customize this behaviour, see {@link MessageFormatOptions.localeCodeFromKey}.
 *
 * @example
 * ```
 * import { writeFileSync } from 'fs'
 * import MessageFormat from '@messageformat/core'
 * import compileModule from '@messageformat/core/compile-module'
 *
 * const mf = new MessageFormat('en')
 * const msgSet = {
 *   a: 'A {TYPE} example.',
 *   b: 'This has {COUNT, plural, one{one member} other{# members}}.',
 *   c: 'We have {P, number, percent} code coverage.'
 * }
 * const msgModule = compileModule(mf, msgSet)
 * writeFileSync('messages.js', msgModule)
 *
 * ...
 *
 * import messages from './messages'
 *
 * messages.a({ TYPE: 'more complex' })  // 'A more complex example.'
 * messages.b({ COUNT: 3 })              // 'This has 3 members.'
 * ```
 *
 * @param messageformat - A {@link MessageFormat} instance
 * @param messages - A hierarchical structure of ICU MessageFormat strings
 */
export default function compileModule(messageformat: MessageFormat<'string' | 'values'>, messages: StringStructure): string;
