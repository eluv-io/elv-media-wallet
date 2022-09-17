#
# testing an index rewriter app
#

build:
	npm run build-wallet-ops-test

clean:
	rm -rf dist/

deploy:
	npm run build-wallet-ops-test && firebase deploy --only functions,hosting:elv-rewriter

toplevel-test:
	#curl -s https://elv-rewriter.web.app/index.html | head
	curl -s https://elv-rewriter.web.app/ | head
	curl -s https://elv-rewriter.firebaseapp.com/ | head
	#curl -s -H "Host: dollyverse.com" https://elv-rewriter.web.app/ | head

functions-test:
	@echo --- emulator
	curl http://localhost:5001/elv-rewriter/us-central1/ping || true
	@echo --- real
	curl https://us-central1-elv-rewriter.cloudfunctions.net/ping
	@echo --- emulator index
	curl http://localhost:5001/elv-rewriter/us-central1/create_index_html

emu:
	firebase emulators:start

wallet-ops:
	@echo :8094
	npm run serve-wallet-ops-test

media-wallet:
	@echo :8090
	npm run serve-https
