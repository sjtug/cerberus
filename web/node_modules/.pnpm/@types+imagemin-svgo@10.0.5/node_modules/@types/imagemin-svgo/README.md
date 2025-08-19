# Installation
> `npm install --save @types/imagemin-svgo`

# Summary
This package contains type definitions for imagemin-svgo (https://github.com/imagemin/imagemin-svgo#readme).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/imagemin-svgo.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/imagemin-svgo/index.d.ts)
````ts
import { Plugin } from "imagemin";
import { OptimizeOptions as SvgoOptions } from "svgo";

/**
 * SVGO imagemin plugin
 */
declare function imageminSvgo(options?: Options): Plugin;

export type Options = SvgoOptions & {
    /**
     * Pass over SVGs multiple times to ensure all optimizations are applied
     * @default true
     */
    multipass?: boolean | undefined;
};

export default imageminSvgo;

````

### Additional Details
 * Last updated: Tue, 07 Nov 2023 03:09:37 GMT
 * Dependencies: [@types/imagemin](https://npmjs.com/package/@types/imagemin), [@types/svgo](https://npmjs.com/package/@types/svgo)

# Credits
These definitions were written by [Romain Faust](https://github.com/romain-faust), and [Piotr Błażejewicz](https://github.com/peterblazejewicz).
