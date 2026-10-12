import { register } from "node:module";

register("./ts-loader.mjs", import.meta.url);
register("./wellness-loader.mjs", import.meta.url);
