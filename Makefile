.PHONY: build
build: setup
	bun run ./script/build-esbuild-config.ts

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

.PHONY: format
format:
	bun x @biomejs/biome check --write

.PHONY: prepublishOnly
prepublishOnly: clean build
