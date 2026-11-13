import { register } from "node:module";

register("./ts-loader.mjs", import.meta.url);
register("./membership-supabase-loader.mjs", import.meta.url);
