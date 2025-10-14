#!/usr/bin/env bats

load test_helpers/utilities

CONTAINER_NAME="app-sdk-grpc-ts"
TRACER_NAME="hello-world-tracer"
METER_NAME="hello-world-meter"
NODE_METER_NAME="node-monitor-meter"
LOG_SCOPE_NAME="node-logger"

setup_file() {
	echo "# 🚧 Starting smoke-sdk-grpc-ts tests" >&3
	echo "# 📦 Starting containers: collector ${CONTAINER_NAME}" >&3
	docker compose up --detach collector ${CONTAINER_NAME} >&3 2>&3
	wait_for_ready_app ${CONTAINER_NAME}
	echo "# 🌐 Sending test request to http://localhost:3000" >&3
	curl --silent "http://localhost:3000"
	echo "# 🌐 Sending test request to http://localhost:3000/logs" >&3
	curl --silent "http://localhost:3000/logs"
	wait_for_traces
	wait_for_metrics 15
}

teardown_file() {
	echo "# 🧹 Cleaning up smoke-sdk-grpc-ts tests" >&3
	echo "# 💾 Saving collector data to data-${CONTAINER_NAME}.json" >&3
	cp collector/data.json collector/data-results/data-${CONTAINER_NAME}.json
	echo "# 🛑 Stopping ${CONTAINER_NAME} container" >&3
	docker compose stop ${CONTAINER_NAME} >&3 2>&3
	echo "# 🔄 Restarting collector" >&3
	docker compose restart collector >&3 2>&3
	wait_for_flush
}

# TESTS

@test "Auto instrumentation produces Express middleware spans" {
  echo "# ✅ Testing: Auto instrumentation produces Express middleware spans" >&3
  result=$(span_names_for "@opentelemetry/instrumentation-express" | grep -c "middleware")
  [ "$result" -ge 4 ]
}

@test "Auto instrumentation produces http request spans" {
  echo "# ✅ Testing: Auto instrumentation produces http request spans" >&3
  result=$(span_names_for "@opentelemetry/instrumentation-http")
  echo "$result" | grep -q "GET /"
  echo "$result" | grep -q "GET /logs"
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

@test "Manual instrumentation produces metrics for counter" {
    result=$(metric_names_for ${METER_NAME})
    assert_equal "$result" '"sheep"'
}
@test "Manual instrumentation produces metrics for observable gauge" {
    result=$(metric_names_for ${NODE_METER_NAME})
    assert_equal "$result" '"process.runtime.nodejs.memory.heap.total"'
}

@test "Pino logger produces logs with different severity levels" {
	echo "# ✅ Testing: Pino logger produces logs with different severity levels" >&3
	result=$(log_severities_for ${LOG_SCOPE_NAME} | grep -E '"(info|warn|error|fatal)"' | wc -l | xargs)
	[ "$result" -ge 4 ]
}

@test "Pino logger produces info level log" {
	echo "# ✅ Testing: Pino logger produces info level log" >&3
	result=$(log_bodies_for ${LOG_SCOPE_NAME} | grep "This is an info log")
	assert_equal "$result" '"This is an info log"'
}

@test "Pino logger produces error level log" {
	echo "# ✅ Testing: Pino logger produces error level log" >&3
	result=$(log_bodies_for ${LOG_SCOPE_NAME} | grep "This is an error log")
	assert_equal "$result" '"This is an error log"'
}
