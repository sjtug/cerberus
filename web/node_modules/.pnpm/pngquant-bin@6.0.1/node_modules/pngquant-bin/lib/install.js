'use strict';
const path = require('path');
const binBuild = require('bin-build');
const bin = require('.');

bin.run(['--version']).then(() => {
	console.log('pngquant pre-build test passed successfully');
}).catch(async error => {
	console.warn(error.message);
	console.warn('pngquant pre-build test failed');
	console.info('compiling from source');

	const libpng = process.platform === 'darwin' ? 'libpng' : 'libpng-dev';

	try {
		await binBuild.file(path.resolve(__dirname, '../vendor/source/pngquant.tar.gz'), [
			'rm ./INSTALL',
			`./configure --prefix="${bin.dest()}"`,
			`make install BINPREFIX="${bin.dest()}"`
		]);

		console.log('pngquant built successfully');
	} catch (error) {
		error.message = `pngquant failed to build, make sure that ${libpng} is installed`;
		console.error(error.stack);

		// eslint-disable-next-line unicorn/no-process-exit
		process.exit(1);
	}
});
