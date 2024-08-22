#: cleans up smoke test output
clean-smoke-tests:
	rm -rf ./smoke-tests/collector/data.json
	rm -rf ./smoke-tests/collector/data-results/*.json
	rm -rf ./smoke-tests/report.*

#: cleans up TS build, smoke test output, and example app detritus
squeaky-clean: clean clean-smoke-tests
	rm -rf ./examples/dist
	rm -rf ./examples/node_modules
	rm -rf ./examples/hello-node/dist
	rm -rf ./examples/hello-node/node_modules
	rm -rf ./examples/hello-node-express/dist
	rm -rf ./examples/hello-node-express/node_modules
	rm -rf ./examples/hello-node-express-ts/dist
	rm -rf ./examples/hello-node-express-ts/node_modules

smoke-tests/collector/data.json:
	@echo ""
	@echo "+++ Zhuzhing smoke test's Collector data.json"
	@touch $@ && chmod o+w $@

smoke-sdk-grpc: smoke-tests/collector/data.json
	@echo ""
	@echo "+++ Running gRPC smoke tests."
	@echo ""
	cd smoke-tests && bats ./smoke-sdk-grpc.bats --report-formatter junit --output ./

smoke-sdk-grpc-ts: smoke-tests/collector/data.json
	@echo ""
	@echo "+++ Running gRPC smoke tests for TypeScript."
	@echo ""
	cd smoke-tests && bats ./smoke-sdk-grpc-ts.bats --report-formatter junit --output ./

smoke-sdk-http: smoke-tests/collector/data.json
	@echo ""
	@echo "+++ Running HTTP smoke tests."
	@echo ""
	cd smoke-tests && bats ./smoke-sdk-http.bats --report-formatter junit --output ./

smoke-sdk-http-ts: smoke-tests/collector/data.json
	@echo ""
	@echo "+++ Running HTTP smoke tests for TypeScript."
	@echo ""
	cd smoke-tests && bats ./smoke-sdk-http-ts.bats --report-formatter junit --output ./

smoke-sdk: smoke-sdk-http smoke-sdk-http-ts

smoke: docker_compose_present
	@echo ""
	@echo "+++ Smoking all the tests."
	@echo ""
	cd smoke-tests && bats . --report-formatter junit --output ./

unsmoke: docker_compose_present
	@echo ""
	@echo "+++ Spinning down the smokers."
	@echo ""
	cd smoke-tests && docker compose down --volumes

#: use this for local smoke testing
resmoke: unsmoke smoke

.PHONY: clean-smoke-tests example smoke unsmoke resmoke smoke-sdk-grpc smoke-sdk-http smoke-sdk

.PHONY: docker_compose_present
docker_compose_present:
	@which docker compose || (echo "Required docker compose command is missing"; exit 1)
