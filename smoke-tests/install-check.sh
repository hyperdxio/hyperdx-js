#!/usr/bin/env bash
#
# Fresh-install load check.
#
# Reproduces a clean `npm install` of the published-shape @hyperdx Node packages with
# their @opentelemetry/* transitive deps floating to the latest matching versions, then
# asserts each package's entrypoint loads under a plain CJS `require`.
#
# This is the gate that would have caught https://github.com/hyperdxio/hyperdx/issues/2630:
# a private OTel build-path import (`@opentelemetry/sdk-trace-base/build/src/enums`) that
# vanished when `sdk-trace-base` floated from 2.7.x to 2.9.0. The regular unit/smoke CI
# never notices because it installs against the committed yarn.lock, which pins the OTel
# transitive deps to a version where the private path still exists.
#
# Prerequisite: packages must already be built (`yarn ci:build` / `nx run-many --target=build`).
#
# Usage:
#   smoke-tests/install-check.sh            # float OTel deps to latest (drift gate)
#   smoke-tests/install-check.sh --pin-otel # additionally pin sdk-trace-base@2.9.0 as a
#                                           # deterministic regression against #2630
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Only the Node-requireable packages. Deliberately excludes deno / browser / otel-web /
# session-recorder / cli, which are browser bundles or expose `exports` maps / DOM globals
# and would false-fail a bare Node `require`.
NODE_PKGS=(node-opentelemetry instrumentation-exception instrumentation-sentry-node node-logger)

PIN_OTEL=false
if [[ "${1:-}" == "--pin-otel" ]]; then
  PIN_OTEL=true
fi

TARBALL_DIR="$(mktemp -d)"
CONSUMER_DIR="$(mktemp -d)"
cleanup() { rm -rf "$TARBALL_DIR" "$CONSUMER_DIR"; }
trap cleanup EXIT

echo "+++ Packing @hyperdx Node packages -> $TARBALL_DIR"
for p in "${NODE_PKGS[@]}"; do
  ( cd "$REPO_ROOT/packages/$p" && npm pack --pack-destination "$TARBALL_DIR" >/dev/null )
done

echo "+++ Generating clean-consumer package.json in $CONSUMER_DIR"
# @hyperdx/* -> local tarballs (via dependencies AND npm `overrides`, so inter-package
# @hyperdx deps resolve to the freshly-built tarballs, not the buggy registry copies).
# @opentelemetry/* are intentionally NOT constrained, so they float to latest.
REPO_ROOT="$REPO_ROOT" TARBALL_DIR="$TARBALL_DIR" CONSUMER_DIR="$CONSUMER_DIR" \
  PIN_OTEL="$PIN_OTEL" PKGS="${NODE_PKGS[*]}" node <<'NODE'
const fs = require('fs');
const path = require('path');
const { REPO_ROOT, TARBALL_DIR, CONSUMER_DIR, PIN_OTEL, PKGS } = process.env;

const deps = {};
const overrides = {};
for (const dir of PKGS.split(' ')) {
  const pkg = require(path.join(REPO_ROOT, 'packages', dir, 'package.json'));
  // npm pack filename: scope stripped, "/" -> "-", suffixed with the version.
  const tarball = `${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`;
  const abs = path.join(TARBALL_DIR, tarball);
  if (!fs.existsSync(abs)) throw new Error(`missing tarball: ${abs}`);
  deps[pkg.name] = `file:${abs}`;
  overrides[pkg.name] = `file:${abs}`;
}

if (PIN_OTEL === 'true') {
  // Deterministic regression against #2630: the version that dropped build/src/enums.
  deps['@opentelemetry/sdk-trace-base'] = '2.9.0';
}

fs.writeFileSync(
  path.join(CONSUMER_DIR, 'package.json'),
  JSON.stringify({ name: 'hdx-clean-consumer', private: true, dependencies: deps, overrides }, null, 2),
);
NODE

if [[ "$PIN_OTEL" == "true" ]]; then
  echo "+++ npm install (sdk-trace-base pinned to 2.9.0; other OTel deps float to latest)"
else
  echo "+++ npm install (OTel deps float to latest)"
fi
( cd "$CONSUMER_DIR" && npm install --no-package-lock --no-audit --no-fund )

echo "+++ Requiring each entrypoint"
FAILED=0
for p in "${NODE_PKGS[@]}"; do
  name="$(node -p "require('$REPO_ROOT/packages/$p/package.json').name")"
  if ( cd "$CONSUMER_DIR" && node -e "require('$name')" ); then
    echo "  ok: require('$name')"
  else
    echo "  FAIL: require('$name')"
    FAILED=1
  fi
done

if [[ "$FAILED" -ne 0 ]]; then
  echo "+++ Fresh-install load check FAILED"
  exit 1
fi
echo "+++ Fresh-install load check passed"
