import path$1 from 'pathe';
import fs from 'fs-extra';
import path from 'path';
import chalk from 'chalk';
import Debug from 'debug';
import imagemin from 'imagemin';
import imageminGif from 'imagemin-gifsicle';
import imageminPng from 'imagemin-pngquant';
import imageminOptPng from 'imagemin-optipng';
import imageminJpeg from 'imagemin-mozjpeg';
import imageminSvgo from 'imagemin-svgo';
import imageminWebp from 'imagemin-webp';
import imageminJpegTran from 'imagemin-jpegtran';

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
    if (fs.existsSync(root)) {
      const stat = fs.lstatSync(root);
      if (stat.isDirectory()) {
        const files = fs.readdirSync(root);
        files.forEach(function(file) {
          const t = readAllFiles(path.join(root, "/", file), reg);
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

const debug = Debug.debug("vite-plugin-imagemin");
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
      content = await imagemin.buffer(buffer, {
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
        filterFile(path$1.resolve(outputPath, key), filter) && files.push(key);
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
            const filePath = publicFilePath.replace(publicDir + path$1.sep, "");
            const fullFilePath = path$1.join(outputPath, filePath);
            if (fs.existsSync(fullFilePath) === false) {
              return;
            }
            const { mtimeMs } = await fs.stat(fullFilePath);
            if (mtimeMs <= (mtimeCache.get(filePath) || 0)) {
              return;
            }
            const buffer = await fs.readFile(fullFilePath);
            const content = await processFile(filePath, buffer);
            if (content) {
              await fs.writeFile(fullFilePath, content);
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
${chalk.cyan("\u2728 [vite-plugin-imagemin]")}- compressed image resource successfully: `);
  const keyLengths = Array.from(recordMap.keys(), (name) => name.length);
  const valueLengths = Array.from(recordMap.values(), (value) => `${Math.floor(100 * value.ratio)}`.length);
  const maxKeyLength = Math.max(...keyLengths);
  const valueKeyLength = Math.max(...valueLengths);
  recordMap.forEach((value, name) => {
    let { ratio } = value;
    const { size, oldSize } = value;
    ratio = Math.floor(100 * ratio);
    const fr = `${ratio}`;
    const denseRatio = ratio > 0 ? chalk.red(`+${fr}%`) : ratio <= 0 ? chalk.green(`${fr}%`) : "";
    const sizeStr = `${oldSize.toFixed(2)}kb / tiny: ${size.toFixed(2)}kb`;
    config.logger.info(chalk.dim(path$1.basename(config.build.outDir)) + "/" + chalk.blueBright(name) + " ".repeat(2 + maxKeyLength - name.length) + chalk.gray(`${denseRatio} ${" ".repeat(valueKeyLength - fr.length)}`) + " " + chalk.dim(sizeStr));
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
    plugins.push(imageminGif(opt));
  }
  if (isNotFalse(mozjpeg)) {
    debug("mozjpeg:", true);
    const opt = isBoolean(mozjpeg) ? void 0 : mozjpeg;
    plugins.push(imageminJpeg(opt));
  }
  if (isNotFalse(pngquant)) {
    debug("pngquant:", true);
    const opt = isBoolean(pngquant) ? void 0 : pngquant;
    plugins.push(imageminPng(opt));
  }
  if (isNotFalse(optipng)) {
    debug("optipng:", true);
    const opt = isBoolean(optipng) ? void 0 : optipng;
    plugins.push(imageminOptPng(opt));
  }
  if (isNotFalse(svgo)) {
    debug("svgo:", true);
    const opt = isBoolean(svgo) ? void 0 : svgo;
    plugins.push(imageminSvgo(opt));
  }
  if (isNotFalse(webp)) {
    debug("webp:", true);
    const opt = isBoolean(webp) ? void 0 : webp;
    plugins.push(imageminWebp(opt));
  }
  if (isNotFalse(jpegTran)) {
    debug("webp:", true);
    const opt = isBoolean(jpegTran) ? void 0 : jpegTran;
    plugins.push(imageminJpegTran(opt));
  }
  return plugins;
}

export { index as default };
