import fs from 'node:fs';
import process from 'node:process';
import {fileURLToPath} from 'node:url';
import BinWrapper from 'bin-wrapper';

const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url)));
const url = `https://raw.githubusercontent.com/imagemin/jpegtran-bin/v${pkg.version}/vendor/`;

const binWrapper = new BinWrapper()
	.src(`${url}macos/jpegtran`, 'darwin')
	.src(`${url}linux/x86/jpegtran`, 'linux', 'x86')
	.src(`${url}linux/x64/jpegtran`, 'linux', 'x64')
	.src(`${url}freebsd/x86/jpegtran`, 'freebsd', 'x86')
	.src(`${url}freebsd/x64/jpegtran`, 'freebsd', 'x64')
	.src(`${url}sunos/x86/jpegtran`, 'sunos', 'x86')
	.src(`${url}sunos/x64/jpegtran`, 'sunos', 'x64')
	.src(`${url}win/x86/jpegtran.exe`, 'win32', 'x86')
	.src(`${url}win/x64/jpegtran.exe`, 'win32', 'x64')
	.src(`${url}win/x86/libjpeg-62.dll`, 'win32', 'x86')
	.src(`${url}win/x64/libjpeg-62.dll`, 'win32', 'x64')
	.dest(fileURLToPath(new URL('../vendor', import.meta.url)))
	.use(process.platform === 'win32' ? 'jpegtran.exe' : 'jpegtran');

export default binWrapper;
