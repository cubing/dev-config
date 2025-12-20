import { $ } from "bun";
import { build } from "esbuild";
import { es2022Lib } from "../src/esbuild/es2022";

await $`bun x tsc --project ./src/`;
await build({
  ...es2022Lib(),
  entryPoints: [
    "./src/esbuild/es2022/index.ts",
    "./src/lib/check-allowed-imports/index.ts",
  ],
  outdir: "./",
});
