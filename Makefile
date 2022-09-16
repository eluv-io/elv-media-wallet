#
# testing an index rewriter app
#

build:
	npm install

clean:
	rm -rf dist/

deploy:
	npm run build-wallet-ops-test && firebase deploy --only hosting:elv-rewriter

wallet-ops:
	@echo :8094
	npm run serve-wallet-ops-test

media-wallet:
	@echo :8090
	npm run serve-https
