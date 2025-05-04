## `@cubing/dev-config`

### Usage

### `es2022-types`

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
