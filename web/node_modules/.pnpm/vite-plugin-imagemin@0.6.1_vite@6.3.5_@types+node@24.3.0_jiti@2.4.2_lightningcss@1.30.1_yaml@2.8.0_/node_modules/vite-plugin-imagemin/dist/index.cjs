'use strict';

const path$1 = require('pathe');
const fs = require('fs-extra');
const path = require('path');
const chalk = require('chalk');
const Debug = require('debug');
const imagemin = require('imagemin');
const imageminGif = require('imagemin-gifsicle');
const imageminPng = require('imagemin-pngquant');
const imageminOptPng = require('imagemin-optipng');
const imageminJpeg = require('imagemin-mozjpeg');
const imageminSvgo = require('imagemin-svgo');
const imageminWebp = require('imagemin-webp');
const imageminJpegTran = require('imagemin-jpegtran');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e["default"] : e; }

const path__default$1 = /*#__PURE__*/_interopDefaultLegacy(path$1);
const fs__default = /*#__PURE__*/_interopDefaultLegacy(fs);
const path__default = /*#__PURE__*/_interopDefaultLegacy(path);
const chalk__default = /*#__PURE__*/_interopDefaultLegacy(chalk);
const Debug__default = /*#__PURE__*/_interopDefaultLegacy(Debug);
const imagemin__default = /*#__PURE__*/_interopDefaultLegacy(imagemin);
const imageminGif__default = /*#__PURE__*/_interopDefaultLegacy(imageminGif);
const imageminPng__default = /*#__PURE__*/_interopDefaultLegacy(imageminPng);
const imageminOptPng__default = /*#__PURE__*/_interopDefaultLegacy(imageminOptPng);
const imageminJpeg__default = /*#__PURE__*/_interopDefaultLegacy(imageminJpeg);
const imageminSvgo__default = /*#__PURE__*/_interopDefaultLegacy(imageminSvgo);
const imageminWebp__default = /*#__PURE__*/_interopDefaultLegacy(imageminWebp);
const imageminJpegTran__default = /*#__PURE__*/_interopDefaultLegacy(imageminJpegTran);

const isFunction = (arg) => typeof arg === "function";
const isBoolean = (arg) => {
  return typeof arg === "boolean";
};
const isNotFalse = (arg) => {
  return !(isBoolean(arg) && !arg);
};
const isRegExp = (arg) => Object.prototype.toString.call(arg) === "[object RegExp]";
function readAllFiles(root, reg) {
  let resultArr = [];
  try {
    if (fs__default.existsSync(root)) {
      const stat = fs__default.lstatSync(root);
      if (stat.isDirectory()) {
        const files = fs__default.readdirSync(root);
        files.forEach(function(file) {
          const t = readAllFiles(path__default.join(root, "/", file), reg);
          resultArr = resultArr.concat(t);
        });
      } else {
        if (reg !== void 0) {
          if (isFunction(reg.test) && reg.test(root)) {
            resultArr.push(root);
          }
        } else {
          resultArr.push(root);
        }
      }
    }
  } catch (error) {
    console.log(error);
  }
  return resultArr;
}

const debug = Debug__default.debug("vite-plugin-imagemin");
const extRE = /\.(png|jpeg|gif|jpg|bmp|svg)$/i;
function index(options = {}) {
  let outputPath;
  let publicDir;
  let config;
  const { disable = false, filter = extRE, verbose = true } = options;
  if (disable) {
    return {};
  }
  debug("plugin options:", options);
  const mtimeCache = /* @__PURE__ */ new Map();
  let tinyMap = /* @__PURE__ */ new Map();
  async function processFile(filePath, buffer) {
    let content;
    try {
      content = await imagemin__default.buffer(buffer, {
        plugins: getImageminPlugins(options)
      });
      const size = content.byteLength, oldSize = buffer.byteLength;
      tinyMap.set(filePath, {
        size: size / 1024,
        oldSize: oldSize / 1024,
        ratio: size / oldSize - 1
      });
      return content;
    } catch (error) {
      config.logger.error("imagemin error:" + filePath);
    }
  }
  return {
    name: "vite:imagemin",
    apply: "build",
    enforce: "post",
    configResolved(resolvedConfig) {
      config = resolvedConfig;
      outputPath = config.build.outDir;
      if (typeof config.publicDir === "string") {
        publicDir = config.publicDir;
      }
      debug("resolvedConfig:", resolvedConfig);
    },
    async generateBundle(_, bundler) {
      tinyMap = /* @__PURE__ */ new Map();
      const files = [];
      Object.keys(bundler).forEach((key) => {
        filterFile(path__default$1.resolve(outputPath, key), filter) && files.push(key);
      });
      debug("files:", files);
      if (!files.length) {
        return;
      }
      const handles = files.map(async (filePath) => {
        const source = bundler[filePath].source;
        const content = await processFile(filePath, source);
        if (content) {
          bundler[filePath].source = content;
        }
      });
      await Promise.all(handles);
    },
    async closeBundle() {
      if (publicDir) {
        const files = [];
        readAllFiles(publicDir).forEach((file) => {
          filterFile(file, filter) && files.push(file);
        });
        if (files.length) {
          const handles = files.map(async (publicFilePath) => {
            const filePath = publicFilePath.replace(publicDir + path__default$1.sep, "");
            const fullFilePath = path__default$1.join(outputPath, filePath);
            if (fs__default.existsSync(fullFilePath) === false) {
              return;
            }
            const { mtimeMs } = await fs__default.stat(fullFilePath);
            if (mtimeMs <= (mtimeCache.get(filePath) || 0)) {
              return;
            }
            const buffer = await fs__default.readFile(fullFilePath);
            const content = await processFile(filePath, buffer);
            if (content) {
              await fs__default.writeFile(fullFilePath, content);
              mtimeCache.set(filePath, Date.now());
            }
          });
          await Promise.all(handles);
        }
      }
      if (verbose) {
        handleOutputLogger(config, tinyMap);
      }
    }
  };
}
function handleOutputLogger(config, recordMap) {
  config.logger.info(`
${chalk__default.cyan("\u2728 [vite-plugin-imagemin]")}- compressed image resource successfully: `);
  const keyLengths = Array.from(recordMap.keys(), (name) => name.length);
  const valueLengths = Array.from(recordMap.values(), (value) => `${Math.floor(100 * value.ratio)}`.length);
  const maxKeyLength = Math.max(...keyLengths);
  const valueKeyLength = Math.max(...valueLengths);
  recordMap.forEach((value, name) => {
    let { ratio } = value;
    const { size, oldSize } = value;
    ratio = Math.floor(100 * ratio);
    const fr = `${ratio}`;
    const denseRatio = ratio > 0 ? chalk__default.red(`+${fr}%`) : ratio <= 0 ? chalk__default.green(`${fr}%`) : "";
    const sizeStr = `${oldSize.toFixed(2)}kb / tiny: ${size.toFixed(2)}kb`;
    config.logger.info(chalk__default.dim(path__default$1.basename(config.build.outDir)) + "/" + chalk__default.blueBright(name) + " ".repeat(2 + maxKeyLength - name.length) + chalk__default.gray(`${denseRatio} ${" ".repeat(valueKeyLength - fr.length)}`) + " " + chalk__default.dim(sizeStr));
  });
  config.logger.info("\n");
}
function filterFile(file, filter) {
  if (filter) {
    const isRe = isRegExp(filter);
    const isFn = isFunction(filter);
    if (isRe) {
      return filter.test(file);
    }
    if (isFn) {
      return filter(file);
    }
  }
  return false;
}
function getImageminPlugins(options = {}) {
  const {
    gifsicle = true,
    webp = false,
    mozjpeg = false,
    pngquant = false,
    optipng = true,
    svgo = true,
    jpegTran = true
  } = options;
  const plugins = [];
  if (isNotFalse(gifsicle)) {
    debug("gifsicle:", true);
    const opt = isBoolean(gifsicle) ? void 0 : gifsicle;
    plugins.push(imageminGif__default(opt));
  }
  if (isNotFalse(mozjpeg)) {
    debug("mozjpeg:", true);
    const opt = isBoolean(mozjpeg) ? void 0 : mozjpeg;
    plugins.push(imageminJpeg__default(opt));
  }
  if (isNotFalse(pngquant)) {
    debug("pngquant:", true);
    const opt = isBoolean(pngquant) ? void 0 : pngquant;
    plugins.push(imageminPng__default(opt));
  }
  if (isNotFalse(optipng)) {
    debug("optipng:", true);
    const opt = isBoolean(optipng) ? void 0 : optipng;
    plugins.push(imageminOptPng__default(opt));
  }
  if (isNotFalse(svgo)) {
    debug("svgo:", true);
    const opt = isBoolean(svgo) ? void 0 : svgo;
    plugins.push(imageminSvgo__default(opt));
  }
  if (isNotFalse(webp)) {
    debug("webp:", true);
    const opt = isBoolean(webp) ? void 0 : webp;
    plugins.push(imageminWebp__default(opt));
  }
  if (isNotFalse(jpegTran)) {
    debug("webp:", true);
    const opt = isBoolean(jpegTran) ? void 0 : jpegTran;
    plugins.push(imageminJpegTran__default(opt));
  }
  return plugins;
}

module.exports = index;
