import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const Module = require("node:module");
const ts = require("typescript");

export function loadTranspiledModule(modulePath, mocks) {
  const source = fs.readFileSync(modulePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: modulePath,
  });
  const componentModule = new Module(modulePath);
  componentModule.filename = modulePath;
  componentModule.paths = Module._nodeModulePaths(path.dirname(modulePath));
  const originalLoad = Module._load;
  Module._load = function load(request, parent, isMain) {
    if (parent?.filename === modulePath && mocks.has(request)) return mocks.get(request);
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    componentModule._compile(outputText, modulePath);
    return componentModule.exports;
  } finally {
    Module._load = originalLoad;
  }
}
