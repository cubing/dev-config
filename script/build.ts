import { $ } from "bun";
import { build } from "esbuild";
import { es2022Lib } from "../src/esbuild/es2022/index";
import { packageVersion } from "../src/metadata/packageVersion";

await $`bun x tsc --project ./src/`;
await build({
  ...es2022Lib(),
  entryPoints: [
    "./src/bin/package.json/index.ts",
    "./src/esbuild/es2022/index.ts",
    "./src/esbuild/embedded-version-string/index.ts",
    "./src/optique/index.ts",
    "./src/lib/check-allowed-imports/index.ts",
  ],
  outdir: "./",
  define: { "globalThis.PACKAGE_VERSION": JSON.stringify(packageVersion) },
});
