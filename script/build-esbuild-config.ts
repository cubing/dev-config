import { $ } from "bun";
import { build } from "esbuild";
import { es2022Lib } from "../src/esbuild/es2022";

await $`bun x tsc --project ./src/esbuild/`;
await build({
  ...es2022Lib(),
  entryPoints: ["./src/esbuild/es2022/index.ts"],
  outdir: "./esbuild/es2022/",
});
