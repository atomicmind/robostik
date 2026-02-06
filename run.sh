#!/usr/bin/env bash
set -euo pipefail

# Simple server control script for RoboStik
# Usage: ./run.sh {start|stop|restart|status}

DIR="$(cd "$(dirname "$0")" && pwd)"
PIDFILE="$DIR/.run_pid"
LOG="/tmp/robo.log"
PYTHON="$DIR/venv/bin/python"
ENTRY="$DIR/run.py"
PORT=5000

usage() {
  echo "Usage: $0 {start|stop|restart|status}"
  exit 2
}

start() {
  if [ -f "$PIDFILE" ] && kill -0 "$(cat "$PIDFILE")" 2>/dev/null; then
    echo "Server already running (PID $(cat "$PIDFILE"))"
    return 0
  fi

  if ss -ltnp 2>/dev/null | grep -q ":$PORT"; then
    echo "Port $PORT already in use, aborting"
    ss -ltnp | grep ":$PORT" || true
    return 1
  fi

  echo "Starting server..."
  nohup "$PYTHON" "$ENTRY" > "$LOG" 2>&1 &
  PID=$!
  echo "$PID" > "$PIDFILE"
  echo "Started PID $PID, logs: $LOG"
}

stop() {
  if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE")
    if kill -0 "$PID" 2>/dev/null; then
      echo "Stopping PID $PID..."
      kill "$PID" || true
      for i in {1..10}; do
        sleep 0.5
        kill -0 "$PID" 2>/dev/null || break
      done
      if kill -0 "$PID" 2>/dev/null; then
        echo "PID still running, sending SIGKILL"
        kill -9 "$PID" || true
      fi
      echo "Stopped"
    else
      echo "Process $PID not running, removing stale PID file"
    fi
    rm -f "$PIDFILE"
  else
    echo "PID file not found; attempting pkill by command"
    pkill -f "python run.py" || echo "No matching process found"
  fi
}

status() {
  if [ -f "$PIDFILE" ]; then
    PID=$(cat "$PIDFILE")
    if kill -0 "$PID" 2>/dev/null; then
      echo "Running (PID $PID)"
      ss -ltnp | grep ":$PORT" || true
      exit 0
    else
      echo "PID file exists but process not running"
      exit 1
    fi
  else
    if ss -ltnp 2>/dev/null | grep -q ":$PORT"; then
      echo "Port $PORT in use"
      ss -ltnp | grep ":$PORT"
      exit 0
    else
      echo "Not running"
      exit 3
    fi
  fi
}

case "${1:-}" in
  start)
    start
    ;;
  stop)
    stop
    ;;
  restart)
    stop
    start
    ;;
  status)
    status
    ;;
  *)
    usage
    ;;
esac
