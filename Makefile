.PHONY: build
build: setup
	bun run -- ./script/build.ts

.PHONY: check-package.json
check-package.json: build
	bun run -- ./bin/package.json/index.js check

.PHONY: check
check: clean lint test build check-package.json

.PHONY: test
test: check-dependency-constraints

.PHONY: check-dependency-constraints
# `setup` is not currently necessary, because the script does not import any
# dependencies. But it's simpler to keep it as a dep, both conceptually and for
# future-proofing.
check-dependency-constraints: setup
	bun run ./script/check-dependency-constraints.ts

.PHONY: setup
setup:
	bun install --frozen-lockfile

.PHONY: publish
publish:
	npm publish

RM_RF = bun -e 'process.argv.slice(1).map(p => process.getBuiltinModule("node:fs").rmSync(p, {recursive: true, force: true, maxRetries: 5}))' --

.PHONY: clean
clean:
	${RM_RF} ./bin/ ./chunks/ ./esbuild/ ./lib/

.PHONY: reset
reset: clean
	${RM_RF} ./node_modules/

.PHONY: lint
lint: lint-biome lint-typescript

.PHONY: lint-biome
lint-biome: setup
	bun x -- bun-dx --package @biomejs/biome biome -- check

.PHONY: lint-typescript
lint-typescript: setup
	bun x -- bun-dx --package @typescript/native-preview tsgo -- --project ./tsconfig.json

.PHONY: format
format: setup
	bun x -- bun-dx --package @biomejs/biome biome -- check --write

.PHONY: prepublishOnly
prepublishOnly: clean check build
