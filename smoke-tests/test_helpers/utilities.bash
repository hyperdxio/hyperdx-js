# UTILITY FUNCS

spans_from_library_named() {
	spans_received | jq ".scopeSpans[] | select(.scope.name == \"$1\").spans[]"
}

metrics_from_library_named() {
	metrics_received | jq ".scopeMetrics[] | select(.scope.name == \"$1\").metrics[]"
}

spans_received() {
	jq ".resourceSpans[]?" ./collector/data.json
}

metrics_received() {
	jq ".resourceMetrics[]?" ./collector/data.json
}

# test span name
span_names_for() {
	spans_from_library_named $1 | jq '.name'
}

# test span attributes
span_attributes_for() {
	# $1 - library name

	spans_from_library_named $1 | \
		jq ".attributes[]"
}

# test metric name
metric_names_for() {
	metrics_from_library_named $1 | jq '.name'
}

# Arguments
# $1 - retry limit (default 5); Nth retry sleeps for N seconds
wait_for_metrics() {
	echo -n "# ⏳ Waiting for collector to receive metrics" >&3
	NEXT_WAIT_TIME=0
	MAX_RETRIES=${1:-5}
	until [ $NEXT_WAIT_TIME -eq $MAX_RETRIES ] || [ "$(metrics_received)" != "" ]
	do
		echo -n " ... $(( NEXT_WAIT_TIME++ ))s" >&3
		sleep $NEXT_WAIT_TIME
	done
	echo "" >&3
	[ $NEXT_WAIT_TIME -lt $MAX_RETRIES ]
}

# Arguments
# $1 - retry limit (default 5); Nth retry sleeps for N seconds
wait_for_data() {
	echo -n "# ⏳ Waiting for collector to receive data" >&3
	NEXT_WAIT_TIME=0
	MAX_RETRIES=${1:-5}
	until [ $NEXT_WAIT_TIME -eq $MAX_RETRIES ] || [ "$(wc -l ./collector/data.json | awk '{ print $1 }')" -ne 0 ]
	do
		echo -n " ... $(( NEXT_WAIT_TIME++ ))s" >&3
		sleep $NEXT_WAIT_TIME
	done
	echo "" >&3
	[ $NEXT_WAIT_TIME -lt $MAX_RETRIES ]
}

# Arguments
# $1 - retry limit (default 5); Nth retry sleeps for N seconds
wait_for_traces() {
	echo -n "# ⏳ Waiting for collector to receive traces" >&3
	NEXT_WAIT_TIME=0
	MAX_RETRIES=${1:-5}
	until [ $NEXT_WAIT_TIME -eq $MAX_RETRIES ] || [ "$(spans_received)" != "" ]
	do
		echo -n " ... $(( NEXT_WAIT_TIME++ ))s" >&3
		sleep $NEXT_WAIT_TIME
	done
	echo "" >&3
	[ $NEXT_WAIT_TIME -lt $MAX_RETRIES ]
}

wait_for_flush() {
	echo -n "# ⏳ Waiting for collector data flush" >&3
	NEXT_WAIT_TIME=0
	until [ $NEXT_WAIT_TIME -eq 5 ] || [ "$(wc -l ./collector/data.json | awk '{ print $1 }')" -eq 0 ]
	do
		echo -n " ... $(( NEXT_WAIT_TIME++ ))s" >&3
		sleep $NEXT_WAIT_TIME
	done
	echo "" >&3
	[ $NEXT_WAIT_TIME -lt 5 ]
}

# Wait loop for one of our example Dotnet apps to be started and ready to receive traffic.
#
# Arguments:
#   $1 - the name of the container/service in which the app is running
wait_for_ready_app() {
	CONTAINER=${1:?container name is a required parameter}
	MAX_RETRIES=10
	echo -n "# 🍿 Setting up ${CONTAINER}" >&3
	NEXT_WAIT_TIME=0
	until [ $NEXT_WAIT_TIME -eq $MAX_RETRIES ] || [[ $(docker-compose logs ${CONTAINER} | grep "Now listening on:") ]]
	do
		echo -n " ... $(( NEXT_WAIT_TIME++ ))s" >&3
		sleep $NEXT_WAIT_TIME
	done
	echo "" >&3
	[ $NEXT_WAIT_TIME -lt $MAX_RETRIES ]
}

# Fail and display details if the expected and actual values do not
# equal. Details include both values.
#
# Lifted and then drastically simplified from bats-assert * bats-support
assert_equal() {
	if [[ $1 != "$2" ]]; then
		{
			echo
			echo "-- 💥 values are not equal 💥 --"
			echo "expected : $2"
			echo "actual   : $1"
			echo "--"
			echo
		} >&2 # output error to STDERR
		return 1
	fi
}
