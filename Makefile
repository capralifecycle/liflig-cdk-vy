.PHONY: all
all: build

.PHONY: install-deps
install-deps:
ifeq ($(CI),true)
	npm ci
else
	npm install
endif

.PHONY: build
build: clean install-deps
	npm run lint
	npm run build
	npm run test

.PHONY: lint
lint:
	npm run lint

.PHONY: lint-fix
lint-fix:
	npm run lint:fix

.PHONY: test
test:
	npm run test

.PHONY: validate-renovate-config
validate-renovate-config:
	npx --yes --package renovate@latest -- renovate-config-validator --strict renovate.json

.PHONY: release
release:
	npm run semantic-release

.PHONY: clean
clean:
	rm -rf lib/

.PHONY: clean-all
clean-all: clean
	rm -rf node_modules/

.PHONY: upgrade-dependencies
upgrade-dependencies:
	npm run upgrade-dependencies
