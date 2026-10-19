#!/usr/bin/env bash
# PreToolUse(Bash): blocks git/gh commands that break the branch flow. Exit 2 sends the reasons back to Claude.
set -uo pipefail

input=$(cat)
cmd=$(jq -r '.tool_input.command // ""' <<<"$input")
cwd=$(jq -r '.cwd // "."' <<<"$input")
types='feat|fix|chore|docs|refactor|test|perf|build|ci|revert'
git_cmd='(^|[[:space:];&|(])git +'
problems=()

# New branches: git checkout -b X, git switch -c X, git branch X
while read -r name; do
  [[ -z $name ]] && continue
  if [[ ! $name =~ ^($types)/[a-z0-9]+(-[a-z0-9]+)*$ ]] || ((${#name} > 50)); then
    problems+=("branch \"$name\" must be <type>/<kebab-case>, ≤ 50 chars, type: ${types//|/, }")
  fi
done < <(grep -oE "${git_cmd}(checkout +-[bB]|switch +(-[cC]|--create)|branch) +[\"']?[^-[:space:];&|\"'][^[:space:];&|\"']*" <<<"$cmd" |
  awk '{print $NF}' | tr -d "\"'")

branch=$(git -C "$cwd" rev-parse --abbrev-ref HEAD 2>/dev/null)
if grep -qE "${git_cmd}(commit|push)" <<<"$cmd" && [[ $branch == main || $branch == staging ]]; then
  problems+=("on protected branch \"$branch\": create a <type>/<kebab-case> branch from staging first")
fi
if grep -qE "${git_cmd}push[^;&|]*[[:space:]]([^[:space:]]+:)?(main|staging)([[:space:];&|]|$)" <<<"$cmd"; then
  problems+=("never push to main/staging: open a PR to staging instead")
fi
if grep -qE '(^|[[:space:];&|(])gh +pr +create' <<<"$cmd" && ! grep -qE '(--base|-B)[ =]staging' <<<"$cmd"; then
  problems+=("PRs go to staging only: add --base staging")
fi
if grep -qE '(^|[[:space:];&|(])gh +pr +merge' <<<"$cmd"; then
  problems+=("merging PRs is the user's job")
fi

if ((${#problems[@]} > 0)); then
  printf '%s\n' "${problems[@]}" >&2
  exit 2
fi
