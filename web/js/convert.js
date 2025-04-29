import { parse } from "yaml";
import fs from "fs";
import { globSync } from "glob";

import convert from "@messageformat/convert";
import MessageFormat from "@messageformat/core";
import compileModule from "@messageformat/core/compile-module.js";

const files = globSync(process.argv[2] + "/*.yaml");
const yamlData = Object.assign(
  {},
  ...files.map((file) => parse(fs.readFileSync(file, "utf8")))
);

const { locales, translations } = convert(yamlData);

const compiled = compileModule(new MessageFormat(locales), translations);
fs.writeFileSync(process.argv[3], compiled);
