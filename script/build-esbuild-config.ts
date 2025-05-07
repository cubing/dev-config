import { $ } from "bun";
import { build } from "esbuild";
import { es2022 } from "../src/esbuild/es2022";

await $`bun x tsc --project ./src/esbuild/`;
await build({
  ...es2022,
  entryPoints: ["./src/esbuild/es2022/index.ts"],
  outdir: "./esbuild/es2022/",
});
