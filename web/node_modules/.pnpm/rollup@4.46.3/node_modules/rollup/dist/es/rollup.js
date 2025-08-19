/*
  @license
	Rollup.js v4.46.3
	Mon, 18 Aug 2025 05:58:14 GMT - commit f74df5e171bf9ba0e281e09be9de041afa2f4f12

	https://github.com/rollup/rollup

	Released under the MIT License.
*/
export { version as VERSION, defineConfig, rollup, watch } from './shared/node-entry.js';
import './shared/parseAst.js';
import '../native.js';
import 'node:path';
import 'path';
import 'node:process';
import 'node:perf_hooks';
import 'node:fs/promises';
