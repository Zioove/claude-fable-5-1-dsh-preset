#!/usr/bin/env bash
# Install the Claude Fable 5.1 agent preset into a DeepSeek Harness home.
#
#   bash scripts/install.sh          # refuse to overwrite
#   FORCE=1 bash scripts/install.sh  # overwrite
set -euo pipefail

root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_dir="$root/preset"
dsh_home="${DSH_HOME:-$HOME/.dsh}"
target="$dsh_home/.agent-presets/claude-fable-5-1"

[ -f "$source_dir/agent.cordis.yml" ] || { echo "preset/agent.cordis.yml not found under $root" >&2; exit 1; }

if [ -e "$target" ] && [ "${FORCE:-0}" != "1" ]; then
  echo "$target already exists; re-run with FORCE=1 to overwrite" >&2
  exit 1
fi

mkdir -p "$target"
cp "$source_dir/agent.cordis.yml" "$target/agent.cordis.yml"
cp "$source_dir/preset.yml" "$target/preset.yml"

echo "installed: $target"
ls -l "$target"
echo
echo 'Pick "Claude Fable 5.1" in the preset picker, or set:'
echo '  agent-presets:'
echo '    default: claude-fable-5-1'
echo "in $dsh_home/settings.yaml"
