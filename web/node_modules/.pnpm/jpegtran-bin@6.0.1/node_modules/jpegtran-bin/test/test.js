import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import test from 'ava';
import execa from 'execa';
import tempy from 'tempy';
import binCheck from 'bin-check';
import binBuild from 'bin-build';
import compareSize from 'compare-size';
import jpegtran from '../index.js';

test('rebuild the jpegtran binaries', async t => {
	// Skip the test on Windows
	if (process.platform === 'win32') {
		t.pass();
		return;
	}

	const temporary = tempy.directory();
	const cfg = [
		'./configure --disable-shared',
		`--prefix="${temporary}" --bindir="${temporary}"`,
	].join(' ');
	const source = fileURLToPath(new URL('../vendor/source/libjpeg-turbo-1.5.1.tar.gz', import.meta.url));

	await binBuild.file(source, [
		cfg,
		'make install',
	]);

	t.true(fs.existsSync(path.join(temporary, 'jpegtran')));
});

test('return path to binary and verify that it is working', async t => {
	t.true(await binCheck(jpegtran, ['-version']));
});

test('minify a JPG', async t => {
	const temporary = tempy.directory();
	const src = fileURLToPath(new URL('fixtures/test.jpg', import.meta.url));
	const dest = path.join(temporary, 'test.jpg');
	const args = [
		'-outfile',
		dest,
		src,
	];

	await execa(jpegtran, args);
	const result = await compareSize(src, dest);

	t.true(result[dest] < result[src]);
});
