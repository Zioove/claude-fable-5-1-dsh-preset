#!/usr/bin/env bash
# Local equivalent of the CI check (kept outside .github/workflows/ so the repo can be
# pushed with an OAuth token that has no `workflow` scope).
#
#   bash scripts/ci-check.sh
#
# Exits non-zero when preset/agent.cordis.yml is not reproducible from base/ + prompt/.
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"

echo "== build =="
node scripts/build.mjs

echo "== reproducibility (git diff --exit-code) =="
if ! git diff --quiet -- preset/agent.cordis.yml; then
  echo "preset/agent.cordis.yml is stale: re-run scripts/build.mjs and commit the result" >&2
  git --no-pager diff --stat -- preset/agent.cordis.yml >&2
  exit 1
fi

echo "== no unresolved prompt variables =="
node -e '
const fs = require("node:fs");
const text = fs.readFileSync("prompt/Claude-Fable-5.1.md", "utf8") + fs.readFileSync("prompt/harness-bridge.md", "utf8");
const groups = text.match(/\{\{/g);
if (groups) { console.error("found " + groups.length + " {{ group(s)"); process.exit(1); }
console.log("ok: no prompt variable groups");
'

echo "== composition structure =="
node scripts/check.mjs

echo
echo "all checks passed"
