import { register } from "node:module";

register("./ts-loader.mjs", import.meta.url);
register("./community-rpc-loader.mjs", import.meta.url);
