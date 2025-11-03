.PHONY: build
build: setup
	bun run ./script/build-esbuild-config.ts

.PHONY: test
test: check-dependency-constraints

.PHONY: check-dependency-constraints
check-dependency-constraints:
	bun run ./script/check-dependency-constraints.ts

.PHONY: setup
setup:
	bun install --frozen-lockfile

.PHONY: publish
publish:
	npm publish

.PHONY: clean
clean:
	rm -rf ./esbuild

.PHONY: reset
reset: clean
	rm -rf ./node_modules

.PHONY: lint
lint:
	bun x @biomejs/biome check
	bun x tsc --project .

.PHONY: format
format:
	bun x @biomejs/biome check --write

.PHONY: prepublishOnly
prepublishOnly: clean build
