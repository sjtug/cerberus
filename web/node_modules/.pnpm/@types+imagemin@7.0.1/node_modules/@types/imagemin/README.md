# Installation
> `npm install --save @types/imagemin`

# Summary
This package contains type definitions for imagemin (https://github.com/imagemin/imagemin#readme).

# Details
Files were exported from https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/imagemin.
## [index.d.ts](https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/imagemin/index.d.ts)
````ts
// Type definitions for imagemin 7.0
// Project: https://github.com/imagemin/imagemin#readme
// Definitions by: Romain Faust <https://github.com/romain-faust>
//                 Jeff Chan <https://github.com/hkjeffchan>
// Definitions: https://github.com/DefinitelyTyped/DefinitelyTyped

/// <reference types="node" />

declare function imagemin(input: ReadonlyArray<string>, options?: imagemin.Options): Promise<imagemin.Result[]>;

declare namespace imagemin {
    type Plugin = (input: Buffer) => Promise<Buffer>;

    interface Options {
        destination?: string | undefined;
        plugins: ReadonlyArray<Plugin>;
        glob?: boolean | undefined;
    }

    interface Result {
        data: Buffer;
        sourcePath: string;
        destinationPath: string;
    }

    interface BufferOptions {
        plugins: ReadonlyArray<Plugin>;
    }

    function buffer(buffer: Buffer, options?: BufferOptions): Promise<Buffer>;
}

export = imagemin;

````

### Additional Details
 * Last updated: Tue, 06 Jul 2021 21:33:38 GMT
 * Dependencies: [@types/node](https://npmjs.com/package/@types/node)
 * Global values: none

# Credits
These definitions were written by [Romain Faust](https://github.com/romain-faust), and [Jeff Chan](https://github.com/hkjeffchan).
