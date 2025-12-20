.PHONY: build
build: setup
	bun run ./script/build.ts

.PHONY: check-package.json
check-package.json: build
	bun run ./bin/package.json/index.js check

.PHONY: check
check: clean lint test build check-package.json

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
	rm -rf ./bin/ ./chunks/ ./esbuild/ ./lib/

.PHONY: reset
reset: clean
	rm -rf ./node_modules/

.PHONY: lint
lint:
	bun x @biomejs/biome check
	bun x tsc --project .

.PHONY: format
format:
	bun x @biomejs/biome check --write

.PHONY: prepublishOnly
prepublishOnly: clean check build
