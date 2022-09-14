#
# currently only used for the wallet-ops-deploy
#

build:
	npm install

clean:
	rm -rf dist/

wallet-ops-deploy:
	firebase use production-260101
	npm run build-wallet-ops-test && firebase deploy --only hosting:elv-dapp-sample	

wallet-ops:
	@echo :8094
	npm run serve-wallet-ops-test

media-wallet:
	@echo :8090
	npm run serve-https

client-test:
	@echo :8092
	npm run serve-client-test

login-test:
	@echo :8093
	npm run serve-login-test

