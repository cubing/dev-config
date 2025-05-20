import type { BuildOptions } from "esbuild";

const common = {
  format: "esm",
  target: "es2022",

  bundle: true,
  splitting: true,

  chunkNames: "chunks/[name]-[hash]",
  sourcemap: true,
} as const satisfies BuildOptions;

export function es2022App(options?: { dev?: boolean }): BuildOptions {
  return {
    ...common,
    minify: !options?.dev,
  };
}

export function es2022Lib(): BuildOptions {
  return {
    ...es2022App(),
    minify: false,
    packages: "external",
  };
}
