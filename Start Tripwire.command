#!/bin/bash
# Double-click to run Group Trip Decider locally (macOS).
cd "$(dirname "$0")" || exit 1

if [ ! -f .env.local ]; then
  echo "Missing .env.local. Copy .env.example to .env.local and fill in your keys."
  read -r -p "Press Enter to close." _
  exit 1
fi
[ -d node_modules ] || npm install

PORT=3000
while lsof -i :"$PORT" -sTCP:LISTEN >/dev/null 2>&1; do PORT=$((PORT + 1)); done

# Open the browser as soon as the server answers.
( until curl -s -o /dev/null "http://localhost:$PORT"; do sleep 1; done; open "http://localhost:$PORT" ) &

echo "Starting Group Trip Decider on http://localhost:$PORT  (close this window or press Ctrl+C to stop)"
npx next dev -p "$PORT"
