#: cleans up smoke test output
clean-smoke-tests:
	rm -rf ./smoke-tests/collector/data.json
	rm -rf ./smoke-tests/collector/data-results/*.json
	rm -rf ./smoke-tests/report.*

#: cleans up TS build, smoke test output, and example app detritus
squeaky-clean: clean clean-smoke-tests
	rm -rf ./smoke-tests/hello-node-express-ts/dist
	rm -rf ./smoke-tests/hello-node-express-ts/node_modules

smoke-tests/collector/data.json:
	@echo ""
	@echo "+++ Zhuzhing smoke test's Collector data.json"
	@touch $@ && chmod o+w $@

#: build Docker images for smoke tests (with caching)
build-smoke-images:
	@echo ""
	@echo "+++ Building smoke test Docker images (cached)"
	@echo ""
	cd smoke-tests && docker compose build

smoke-sdk-grpc-ts: build-smoke-images smoke-tests/collector/data.json
	@echo ""
	@echo "+++ Running gRPC smoke tests for TypeScript."
	@echo ""
	cd smoke-tests && bats ./smoke-sdk-grpc-ts.bats --report-formatter junit --output ./ --verbose-run

smoke-sdk-http-ts: build-smoke-images smoke-tests/collector/data.json
	@echo ""
	@echo "+++ Running HTTP smoke tests for TypeScript."
	@echo ""
	cd smoke-tests && bats ./smoke-sdk-http-ts.bats --report-formatter junit --output ./ --verbose-run

smoke-sdk-http-ts-programmaticImports: build-smoke-images smoke-tests/collector/data.json
	@echo ""
	@echo "+++ Running HTTP programmatic imports smoke tests for TypeScript."
	@echo ""
	cd smoke-tests && bats ./smoke-sdk-http-ts-programmaticImports.bats --report-formatter junit --output ./ --verbose-run

smoke-sdk: smoke-sdk-http-ts smoke-sdk-grpc-ts

#: fresh-install load check — packs the Node packages, installs them in a clean project
#: with OTel deps floated to latest, and asserts each entrypoint loads under `require`.
install-check:
	@echo ""
	@echo "+++ Running fresh-install load check"
	@echo ""
	npx nx run-many --target=build --projects=@hyperdx/node-opentelemetry,@hyperdx/instrumentation-exception,@hyperdx/instrumentation-sentry-node,@hyperdx/node-logger
	bash ./smoke-tests/install-check.sh
	bash ./smoke-tests/install-check.sh --pin-otel

smoke: docker_compose_present
	@echo ""
	@echo "+++ Smoking all the tests."
	@echo ""
	cd smoke-tests && bats . --report-formatter junit --output ./ --verbose-run

unsmoke: docker_compose_present
	@echo ""
	@echo "+++ Spinning down the smokers."
	@echo ""
	cd smoke-tests && docker compose down --volumes

#: use this for local smoke testing
resmoke: unsmoke smoke

.PHONY: clean-smoke-tests build-smoke-images example smoke unsmoke resmoke smoke-sdk-grpc-ts smoke-sdk-http-ts smoke-sdk-http-ts-programmaticImports smoke-sdk install-check

.PHONY: docker_compose_present
docker_compose_present:
	@which docker compose || (echo "Required docker compose command is missing"; exit 1)
