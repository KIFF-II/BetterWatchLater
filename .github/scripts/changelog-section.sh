#!/usr/bin/env bash
# Prints the CHANGELOG.md entry for one version, without its heading.
#
# Usage: changelog-section.sh 0.1.1 [path/to/CHANGELOG.md]
#
# An entry starts at a heading like "## [0.1.1] - 2026-10-23" and runs until
# the next "## " heading or the link list at the bottom of the file.

set -euo pipefail

version="$1"
changelog="${2:-CHANGELOG.md}"

section=$(awk -v heading="## [${version}]" '
  index($0, heading) == 1     { inside = 1; next }  # found our heading, start after it
  inside && /^## /            { exit }              # next version starts
  inside && /^\[.*\]: /       { exit }              # link list at the bottom
  inside && !started && /^$/  { next }              # skip blank lines under the heading
  inside                      { started = 1; print }
' "$changelog")
# (Blank lines at the end are dropped by $( ) itself.)

if [ -z "$section" ]; then
  echo "No entry for version ${version} in ${changelog}." >&2
  exit 1
fi

printf '%s\n' "$section"
