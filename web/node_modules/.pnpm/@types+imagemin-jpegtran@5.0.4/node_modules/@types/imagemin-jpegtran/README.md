# Installation
> `npm install --save @types/imagemin-jpegtran`

# Summary
This package contains type definitions for imagemin-jpegtran (https://github.com/imagemin/imagemin-jpegtran#readme).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/imagemin-jpegtran.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/imagemin-jpegtran/index.d.ts)
````ts
import { Plugin } from "imagemin";

declare function imageminJpegtran(options?: imageminJpegtran.Options): Plugin;

declare namespace imageminJpegtran {
    interface Options {
        arithmetic?: boolean | undefined;
        progressive?: boolean | undefined;
    }
}

export = imageminJpegtran;

````

### Additional Details
 * Last updated: Tue, 07 Nov 2023 03:09:37 GMT
 * Dependencies: [@types/imagemin](https://npmjs.com/package/@types/imagemin)

# Credits
These definitions were written by [Romain Faust](https://github.com/romain-faust).
