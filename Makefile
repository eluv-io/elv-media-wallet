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
	curl -s https://elv-rewriter.web.app/index.html | head -15
	curl -s https://elv-rewriter.web.app/maskverse | head -15
	curl -s https://elv-rewriter.firebaseapp.com/dolly/dolly | head -15

functions-test:
	@echo --- emulator
	curl http://localhost:5001/elv-rewriter/us-central1/ping || true
	@echo --- real
	curl https://us-central1-elv-rewriter.cloudfunctions.net/ping

create-index-emu:
	@echo --- emulator index
	curl http://localhost:5001/elv-rewriter/us-central1/create_index_html

load-livedata-emu:
	@echo --- load elv-live data
	curl http://localhost:5001/elv-rewriter/us-central1/load_elv_live_data | jq .

emu:
	firebase emulators:start

wallet-ops:
	@echo :8094
	npm run serve-wallet-ops-test

media-wallet:
	@echo :8090
	npm run serve-https
