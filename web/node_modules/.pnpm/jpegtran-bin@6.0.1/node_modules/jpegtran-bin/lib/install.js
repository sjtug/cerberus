import process from 'node:process';
import {fileURLToPath} from 'node:url';
import binBuild from 'bin-build';
import bin from './index.js';

const args = [
	'-copy',
	'none',
	'-optimize',
	'-outfile',
	fileURLToPath(new URL('../test/fixtures/test-optimized.jpg', import.meta.url)),
	fileURLToPath(new URL('../test/fixtures/test.jpg', import.meta.url)),
];

bin.run(args).then(() => {
	console.log('jpegtran pre-build test passed successfully');
}).catch(async error => {
	console.warn(error.message);
	console.warn('jpegtran pre-build test failed');
	console.info('compiling from source');

	const cfg = [
		'./configure --disable-shared',
		`--prefix="${bin.dest()}" --bindir="${bin.dest()}"`,
	].join(' ');

	try {
		const source = fileURLToPath(new URL('../vendor/source/libjpeg-turbo-1.5.1.tar.gz', import.meta.url));
		await binBuild.file(source, [
			'touch configure.ac aclocal.m4 configure Makefile.am Makefile.in',
			cfg,
			'make install',
		]);

		console.log('jpegtran built successfully');
	} catch (error) {
		console.error(error.stack);

		// eslint-disable-next-line unicorn/no-process-exit
		process.exit(1);
	}
});
