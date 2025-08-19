'use strict';
const binBuild = require('bin-build');
const path = require('path');
const bin = require('.');

bin.run(['-version']).then(() => {
	console.log('cwebp pre-build test passed successfully');
}).catch(error => {
	console.warn(error.message);
	console.warn('cwebp pre-build test failed');
	console.info('compiling from source');

	binBuild.file(path.resolve(__dirname, '../vendor/source/libwebp-1.1.0.tar.gz'), [
		`./configure --disable-shared --prefix="${bin.dest()}" --bindir="${bin.dest()}"`,
		'make && make install'
	]).then(() => { // eslint-disable-line promise/prefer-await-to-then
		console.log('cwebp built successfully');
	}).catch(error => {
		console.error(error.stack);

		// eslint-disable-next-line unicorn/no-process-exit
		process.exit(1);
	});
});
