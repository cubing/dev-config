.PHONY: setup
setup:
	bun install --frozen-lockfile

.PHONY: publish
publish:
	npm publish

.PHONY: clean
clean:
	# no-op

.PHONY: reset
reset: clean
	rm -rf ./node_modules

.PHONY: lint
lint:
	bun x @biomejs/biome check

.PHONY: format
format:
	bun x @biomejs/biome check --write
