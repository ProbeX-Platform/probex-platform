#!/usr/bin/env bash
# Deterministic blast-radius facts for the `impact` agent: what changed against staging and what depends on it.
set -uo pipefail
cd "$(git rev-parse --show-toplevel)" || exit 1

base=$(git merge-base origin/staging HEAD)
changed=$({
  git diff --name-only "$base"
  git ls-files --others --exclude-standard
} | sort -u)
sources=$(grep -E '^packages/[^/]+/src/.*\.ts$' <<<"$changed" | grep -vE '\.(test|d)\.ts$')

section() {
  echo "$1:"
  if [[ -n $2 ]]; then sed 's/^/  /' <<<"$2"; else echo "  none"; fi
}

json_field_changed() {
  [[ $(git show "$base:$1" 2>/dev/null | jq -S ".$2") != $(jq -S ".$2" "$1") ]]
}

sensitive=$(
  grep -E '^packages/[^/]+/src/index\.ts$' <<<"$changed" | sed 's/^/public API: /'
  grep -qE '^packages/protocol/' <<<"$changed" && echo "protocol: packages/protocol"
  grep -qE '^packages/sdk/src/connector/' <<<"$changed" && echo "transport: packages/sdk/src/connector"
  for manifest in $(grep -E '^packages/[^/]+/package\.json$' <<<"$changed"); do
    if ! git cat-file -e "$base:$manifest" 2>/dev/null; then
      echo "new package: $manifest"
      continue
    fi
    json_field_changed "$manifest" exports && echo "public API: $manifest exports"
    json_field_changed "$manifest" dependencies && echo "dependencies: $manifest"
    json_field_changed "$manifest" peerDependencies && echo "peer dependencies: $manifest"
  done
)

importers=$(for file in $sources; do
  name=$(basename "$file" .ts)
  grep -rlE "from ['\"]\.{1,2}/([^'\"]*/)?$name\.js['\"]" packages/*/src examples/*/src 2>/dev/null |
    grep -vxF "$file" | sed "s|^|$file ← |"
done)

untested=$(for file in $sources; do
  [[ -f ${file%.ts}.test.ts ]] || echo "$file"
done)

echo "base: $(git rev-parse --short "$base") (merge-base with origin/staging)"
section "changed files" "$changed"
section "affected packages (changed and their dependents)" \
  "$(pnpm --silent ls -r --depth -1 --filter "...[$base]" --json 2>/dev/null | jq -r '.[].name')"
section "sensitive areas" "$sensitive"
section "importers of changed source files" "$importers"
section "changed source files without a sibling .test.ts" "$untested"
section "docs changed" "$(grep -E '^docs/' <<<"$changed")"
