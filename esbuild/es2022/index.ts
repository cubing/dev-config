import type { BuildOptions } from "esbuild";

export const es2022 = {
  format: "esm",
  target: "es2022",

  bundle: true,
  splitting: true,

  chunkNames: "chunks/[name]-[hash]",
  sourcemap: true,

  packages: "external",
} as const satisfies BuildOptions;
