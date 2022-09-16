#
# testing an index rewriter app
#

build:
	npm install
	npm run build-wallet-ops-test

clean:
	rm -rf dist/

deploy:
	npm run build-wallet-ops-test && firebase deploy --only functions,hosting:elv-rewriter

functions-test:
	@echo --- emulator
	curl http://localhost:5001/elv-rewriter/us-central1/bigben || true
	@echo --- real
	curl https://us-central1-elv-rewriter.cloudfunctions.net/bigben


wallet-ops:
	@echo :8094
	npm run serve-wallet-ops-test

media-wallet:
	@echo :8090
	npm run serve-https
