#!/usr/bin/env bash
set -euo pipefail

# Throwaway spike prototype for issue #49.
# Boots one isolated sandbox workspace via a hardened OCI container, serves a
# sample static landing-page artifact through it on localhost, verifies the
# preview, then tears everything down. Each step is labelled with the
# provider-neutral sandbox workspace contract method (issue #44) it stands
# in for.
#
# Usage: ./scripts/spike/sandbox-prototype/run.sh (from repo root, or anywhere)

cd "$(dirname "$0")"

MARKER="$(grep -o 'lb-spike-marker: [0-9]*' sample-artifact/index.html)"
WS_NAME="lb-spike-$$"
WORKDIR=""
PORT=""

step() {
  echo ""
  echo "▶ ${1}"
}

cleanup() {
  local exit_code=$?
  docker rm -f "$WS_NAME" >/dev/null 2>&1 || true
  if [[ -n "$WORKDIR" && -d "$WORKDIR" ]]; then
    rm -rf "$WORKDIR"
  fi
  exit "$exit_code"
}
trap cleanup EXIT

step "preflight"
if ! command -v docker >/dev/null 2>&1; then
  echo "Docker is required for this spike. Install Docker and try again." >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "Docker is required for this spike, and the Docker daemon is not running." >&2
  exit 1
fi

step "create/writeFiles"
WORKDIR="$(mktemp -d)"
cp -R sample-artifact/. "$WORKDIR"/
echo "workspace created at ${WORKDIR}"

step "exec/exposePort"
docker run -d --name "$WS_NAME" \
  --read-only \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --memory 128m \
  --cpus 0.5 \
  --pids-limit 64 \
  -v "$WORKDIR":/site:ro \
  -p 127.0.0.1:0:8080 \
  busybox:stable httpd -f -p 8080 -h /site >/dev/null

PORT="$(docker port "$WS_NAME" 8080 | sed -n 's/^127\.0\.0\.1:\([0-9]*\)$/\1/p' | head -n1)"
if [[ -z "$PORT" ]]; then
  echo "Could not resolve the ephemeral host port for ${WS_NAME}." >&2
  exit 1
fi
echo "container ${WS_NAME} listening on 127.0.0.1:${PORT}"

step "preview"
PREVIEW_URL="http://127.0.0.1:${PORT}/"
RESPONSE=""
for _ in $(seq 1 15); do
  if RESPONSE="$(curl -fsS "$PREVIEW_URL" 2>/dev/null)"; then
    break
  fi
  sleep 1
done

if [[ -z "$RESPONSE" ]]; then
  echo "Preview never became reachable at ${PREVIEW_URL}." >&2
  exit 1
fi

if [[ "$RESPONSE" != *"$MARKER"* ]]; then
  echo "Preview response did not contain the expected marker (${MARKER})." >&2
  exit 1
fi
echo "preview verified at ${PREVIEW_URL}"

step "destroy"
docker rm -f "$WS_NAME" >/dev/null
rm -rf "$WORKDIR"

if docker ps -a --filter "name=${WS_NAME}" --format '{{.Names}}' | grep -q "^${WS_NAME}\$"; then
  echo "Container ${WS_NAME} still present after teardown." >&2
  exit 1
fi
if [[ -d "$WORKDIR" ]]; then
  echo "Workdir ${WORKDIR} still present after teardown." >&2
  exit 1
fi
if curl -fsS "$PREVIEW_URL" >/dev/null 2>&1; then
  echo "Preview still reachable at ${PREVIEW_URL} after teardown." >&2
  exit 1
fi
echo "teardown verified: container removed, workdir removed, preview unreachable"

WORKDIR=""
echo ""
echo "✅ spike proof passed"
