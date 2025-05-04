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
