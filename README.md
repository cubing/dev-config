# `@cubing/dev-config`

## Usage

### `esbuild`

```js
// Or use `es2022Lib`
import { es2022App } from "@cubing/dev-config/esbuild/es2022";
import { build } from "esbuild";

await build({
  ...es2022App({ dev: true }),
  entryPoints: ["./src/index.ts"],
  outdir: "./dist/lib/",
});
```

### Biome

```jsonc
// biome.json
{
  "$schema": "./node_modules/@biomejs/biome/configuration_schema.json",
  "extends": ["./node_modules/@cubing/dev-config/biome/biome.json"],
  "files": {
    "ignore": [,
      "./dist",
      "./package.json"
    ]
  }
}
```

```shell
# using node
npm install --save-dev @biomejs/biome @cubing/dev-config
npx @biomejs/biome check

# using bun
bun add @biomejs/biome @cubing/dev-config
bun x @biomejs/biome check
```

### TypeScript

### Check types

```jsonc
// tsconfig.json
{
  "extends": "./node_modules/@cubing/dev-config/ts/es2022-types/tsconfig.json",
  "include": ["./src/"]
}
```

```shell
npx tsc --noEmit --project . # using node
bun x tsc --noEmit --project . # using bun
```

### Build types

```jsonc
// tsconfig.json
{
  "extends": "./node_modules/@cubing/dev-config/ts/es2022-types/tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist/lib/types"
  },
  "include": ["./src/"]
}
```

```shell
npx tsc --project . # using node
bun x tsc --project . # using bun
```

## No DOM

Use the `no-dom` variant instead:

```jsonc
// tsconfig.json
{
  "extends": "./node_modules/@cubing/dev-config/ts/es2022-types/no-dom/tsconfig.json"
}
```
