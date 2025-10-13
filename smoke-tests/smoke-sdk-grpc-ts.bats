#!/usr/bin/env bats

load test_helpers/utilities

CONTAINER_NAME="app-sdk-grpc-ts"
TRACER_NAME="hello-world-tracer"
METER_NAME="hello-world-meter"
NODE_METER_NAME="node-monitor-meter"

setup_file() {
	echo "# 🚧 Starting smoke-sdk-grpc-ts tests" >&3
	echo "# 📦 Building and starting containers: collector ${CONTAINER_NAME}" >&3
	docker compose up --build --detach collector ${CONTAINER_NAME}
	wait_for_ready_app ${CONTAINER_NAME}
	echo "# 🌐 Sending test request to http://localhost:3000" >&3
	curl --silent "http://localhost:3000"
	wait_for_traces
	# wait_for_metrics
}

teardown_file() {
	echo "# 🧹 Cleaning up smoke-sdk-grpc-ts tests" >&3
	echo "# 💾 Saving collector data to data-${CONTAINER_NAME}.json" >&3
	cp collector/data.json collector/data-results/data-${CONTAINER_NAME}.json
	echo "# 🛑 Stopping ${CONTAINER_NAME} container" >&3
	docker compose stop ${CONTAINER_NAME}
	echo "# 🔄 Restarting collector" >&3
	docker compose restart collector
	wait_for_flush
}

# TESTS

@test "Auto instrumentation produces 3 Express middleware spans" {
  echo "# ✅ Testing: Auto instrumentation produces 3 Express middleware spans" >&3
  result=$(span_names_for "@opentelemetry/instrumentation-express")
  assert_equal "$result" '"middleware - query"
"middleware - expressInit"
"request handler - /"'
}

@test "Auto instrumentation produces an http request span" {
  echo "# ✅ Testing: Auto instrumentation produces an http request span" >&3
  result=$(span_names_for "@opentelemetry/instrumentation-http")
  assert_equal "$result" '"GET /"'
}

# @test "Manual instrumentation produces span with name of span" {
# 	result=$(span_names_for ${TRACER_NAME})
# 	assert_equal "$result" '"sleep"'
# }

# @test "Manual instrumentation adds custom attribute" {
# 	result=$(span_attributes_for ${TRACER_NAME} | jq "select(.key == \"delay_ms\").value.intValue")
# 	assert_equal "$result" '"100"'
# }

# @test "BaggageSpanProcessor: key-values added to baggage appear on child spans" {
# 	result=$(span_attributes_for ${TRACER_NAME} | jq "select(.key == \"for_the_children\").value.stringValue")
# 	assert_equal "$result" '"another important value"'
# }

# @test "Manual instrumentation produces metrics for counter" {
#     result=$(metric_names_for ${METER_NAME})
#     assert_equal "$result" '"sheep"'
# }
# @test "Manual instrumentation produces metrics for observable gauge" {
#     result=$(metric_names_for ${NODE_METER_NAME})
#     assert_equal "$result" '"process.runtime.nodejs.memory.heap.total"'
# }
