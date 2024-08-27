#!/usr/bin/env bats

load test_helpers/utilities

CONTAINER_NAME="app-sdk-http-ts"
TRACER_NAME="hello-world-tracer"
METER_NAME="hello-world-meter"
NODE_METER_NAME="node-monitor-meter"

setup_file() {
	echo "# 🚧" >&3
	docker compose up --build --detach collector ${CONTAINER_NAME}
	wait_for_ready_app ${CONTAINER_NAME}
	curl --silent "http://localhost:3000"
	wait_for_traces
  # wait_for_metrics 15
}

teardown_file() {
	cp collector/data.json collector/data-results/data-${CONTAINER_NAME}.json
	docker compose stop ${CONTAINER_NAME}
	docker compose restart collector
	wait_for_flush
}

# TESTS

@test "Auto instrumentation produces 3 Express middleware spans" {
  result=$(span_names_for "@opentelemetry/instrumentation-express")
  assert_equal "$result" '"middleware - query"
"middleware - expressInit"
"request handler - /"'
}

@test "Auto instrumentation produces an http request span" {
  result=$(span_names_for "@opentelemetry/instrumentation-http")
  assert_equal "$result" '"GET /"'
}

@test "Manual instrumentation produces span with name of span" {
	result=$(span_names_for ${TRACER_NAME})
	assert_equal "$result" '"sleep"'
}

@test "Manual instrumentation adds custom attribute" {
	result=$(span_attributes_for ${TRACER_NAME} | jq "select(.key == \"delay_ms\").value.intValue")
	assert_equal "$result" '"100"'
}

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
