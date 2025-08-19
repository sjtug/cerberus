# is-cwebp-readable

[![npm version](https://img.shields.io/npm/v/is-cwebp-readable.svg)](https://www.npmjs.com/package/is-cwebp-readable)
[![Build Status](https://travis-ci.com/shinnn/is-cwebp-readable.svg?branch=master)](https://travis-ci.com/shinnn/is-cwebp-readable)
[![Coverage Status](https://img.shields.io/coveralls/shinnn/is-cwebp-readable.svg)](https://coveralls.io/github/shinnn/is-cwebp-readable)

Check if a Buffer/Uint8Array is available for [cwebp](https://developers.google.com/speed/webp/docs/cwebp) image source

```javascript
const {readFileSync} = require('fs');
const isCwebpReadable = require('is-cwebp-readable');

isCwebpReadable(readFileSync('fixture.png')); //=> true
isCwebpReadable(readFileSync('fixture.bmp')); //=> false
```

## Installation

[Use](https://docs.npmjs.com/cli/install) [npm](https://docs.npmjs.com/about-npm/).

```
npm install is-cwebp-readable
```

## API

```javascript
const isCwebpReadable = require('is-cwebp-readable');
```

### isCwebpReadable(*data*)

*data*: [`Buffer`](https://nodejs.org/api/buffer.html#buffer_class_buffer) or [`Uint8Array`](https://developer.mozilla.org/docs/Web/JavaScript/Reference/Global_Objects/Uint8Array)  
Return: `boolean`

It returns `true` if the data is [PNG](https://wikipedia.org/wiki/Portable_Network_Graphics), [JPEG](https://wikipedia.org/wiki/JPEG), [TIFF](https://wikipedia.org/wiki/Tagged_Image_File_Format), or [WebP](https://wikipedia.org/wiki/WebP), otherwise `false`.

## License

[ISC License](./LICENSE) © 2018 Shinnosuke Watanabe
