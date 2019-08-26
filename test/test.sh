#!/bin/bash

set -e

PID="/tmp/optoport-test.pid"

start() {
  stop
  node ../bin.js "$@" & pid=$!
  echo "$pid" > "$PID"
  sleep 2s
}

stop() {
  if [ -e "$PID" ]; then
    kill -s SIGPWR $(cat $PID) 2>/dev/null || /bin/true
  fi
}

verify() {
  OUT=$(echo hi | cat </dev/tcp/127.0.0.1/34456)
  if [[ "$OUT" == "success" ]]; then
    echo "passed $*"
  else
    echo "failed $*"
    exit 2
  fi
}

start test-config.yaml
verify simple
