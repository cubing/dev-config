# `@cubing/dev-config`

## Usage

### `esbuild`

```shell
# using node
npm install --save-dev esbuild @cubing/dev-config

# using bun
bun add esbuild @cubing/dev-config
```

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
    "ignore": [
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

Add to a project using [`repo`](https://github.com/lgarron/repo):

```shell
repo boilerplate biome add # Or invoke using `npx repo …` / `bun x repo …`
```

### TypeScript

#### Check types

```jsonc
// tsconfig.json
{
  "extends": "./node_modules/@cubing/dev-config/ts/es2022-types/tsconfig.json",
  "include": ["./src/"]
}
```

```shell
# using node
npm install --save-dev typescript @cubing/dev-config
npx tsc --noEmit --project .

# using bun
bun add --dev typescript @cubing/dev-config
bun x tsc --noEmit --project .
```

Add to a project using [`repo`](https://github.com/lgarron/repo):

```shell
repo boilerplate tsconfig add # Or invoke using `npx repo …` / `bun x repo …`
```

#### Build types

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
# using node
npm install --save-dev typescript @cubing/dev-config
npx tsc --project .

# using bun
bun add --dev typescript @cubing/dev-config
bun x tsc --project .
```

Add to a project using [`repo`](https://github.com/lgarron/repo):

```shell
repo boilerplate tsconfig add # Or invoke using `npx repo …` / `bun x repo …`
```

#### No DOM

Use the `no-dom` variant instead:

```jsonc
// tsconfig.json
{
  "extends": "./node_modules/@cubing/dev-config/ts/es2022-types/no-dom/tsconfig.json"
}
```

Add to a project using [`repo`](https://github.com/lgarron/repo):

```shell
repo boilerplate tsconfig add --no-dom # Or invoke using `npx repo …` / `bun x repo …`
```

### `es2024`

The following are also available:

- `./node_modules/@cubing/dev-config/ts/es2024-types/tsconfig.json`
- `./node_modules/@cubing/dev-config/ts/es2024-types/no-dom/tsconfig.json`

This is useful for features like `Promise.withResolvers(…)`.

Add to a project using [`repo`](https://github.com/lgarron/repo):

```shell
repo boilerplate tsconfig add --module es2022 # Or invoke using `npx repo …` / `bun x repo …`
repo boilerplate tsconfig add --no-dom --module es2022 # Or invoke using `npx repo …` / `bun x repo …`
```

### Checking `package.json` for a project

Run as follows:

```shell
bun x --package @cubing/dev-config package.json check
```

This checks both syntax and the presence of exports (and similar).
