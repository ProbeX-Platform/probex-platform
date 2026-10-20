#!/usr/bin/env bash
# Checks the PR branch, title and commit subjects against docs/development.md#branches-and-pull-requests.
# Usage: check-names.sh <branch> <pr title> <base sha>..<head sha>
# Every failure says what is wrong and prints the rules with passing and failing examples.
set -uo pipefail

branch=$1 title=$2 range=$3

max_branch=50
max_subject=100
# Branches stay lowercase: on case-insensitive file systems `Feat/x` and `feat/x` are the same ref
branch_re='^[a-z]+/[a-z0-9]+(-[a-z0-9]+)*$'
# Conventional Commits treats type and scope as case-insensitive
subject_re='^[A-Za-z]+(\([A-Za-z0-9-]+\))?!?: [^ ]'

branch_ok() { [[ $1 == staging ]] || { [[ $1 =~ $branch_re ]] && ((${#1} <= max_branch)); }; }
subject_ok() { [[ $1 =~ $subject_re ]] && ((${#1} <= max_subject)); }

# Prints one reason per line for a name that failed branch_ok
branch_problems() {
  local name=$1 type rest
  ((${#name} > max_branch)) && echo "${#name} chars, the limit is $max_branch"
  if [[ $name != */* ]]; then
    echo "no '<type>/' prefix"
    return
  fi
  type=${name%%/*} rest=${name#*/}
  if [[ -z $type ]]; then
    echo "type before '/' is empty"
  elif [[ $type =~ [A-Z] && $type =~ ^[A-Za-z]+$ ]]; then
    echo "type '$type' has uppercase letters: branches are lowercase only"
  elif [[ ! $type =~ ^[a-z]+$ ]]; then
    echo "type '$type' may contain only letters a-z"
  fi
  if [[ -z $rest ]]; then
    echo "name after '/' is empty"
    return
  fi
  [[ $rest == */* ]] && echo "more than one '/': the part after '$type/' cannot contain '/'"
  [[ $rest =~ [A-Z] ]] && echo "'$rest' has uppercase letters: branches are lowercase only"
  [[ $rest =~ [^A-Za-z0-9/-] ]] && echo "'$rest' has characters other than a-z, 0-9 and '-'"
  [[ $rest == -* || $rest == *- ]] && echo "'$rest' starts or ends with '-'"
  [[ $rest == *--* ]] && echo "'$rest' has '--': separate words with a single '-'"
  return 0
}

# Prints one reason per line for a subject that failed subject_ok
subject_problems() {
  local s=$1 head desc type scope
  ((${#s} > max_subject)) && echo "${#s} chars, the limit is $max_subject"
  if [[ $s != *:* ]]; then
    echo "no ':' after '<type>' or '<type>(<scope>)'"
    return
  fi
  head=${s%%:*} desc=${s#*:}
  head=${head%!}
  type=$head
  if [[ $head == *\(* ]]; then
    type=${head%%\(*} scope=${head#*\(}
    if [[ $scope != *\) ]]; then
      echo "scope '($scope' must end with ')' right before ':' or '!:'"
    else
      scope=${scope%\)}
      if [[ -z $scope ]]; then
        echo "scope '()' is empty: name a scope or drop the parentheses"
      elif [[ ! $scope =~ ^[A-Za-z0-9-]+$ ]]; then
        echo "scope '$scope' may contain only letters, digits and '-'"
      fi
    fi
  fi
  if [[ -z $type ]]; then
    echo "type before ':' is empty"
  elif [[ ! $type =~ ^[A-Za-z]+$ ]]; then
    echo "type '$type' may contain only letters (no spaces, digits or symbols)"
  fi
  if [[ -z ${desc// /} ]]; then
    echo "description after ': ' is empty"
  elif [[ $desc != " "* ]]; then
    echo "no space after ':'"
  elif [[ $desc == "  "* ]]; then
    echo "more than one space after ':'"
  fi
  return 0
}

branch_pass=(docs/configs-architecture feat/sdk-snapshots fix/issue-42)
branch_fail=(Docs/configs-architecture feat/Sdk-snapshots feat/sdk_snapshots feat/sdk--snapshots feat/sdk/snapshots
  sdk-snapshots)
subject_pass=('docs: decide configs architecture' 'Docs: decide configs architecture' 'feat(sdk): add snapshots'
  'FEAT(SDK)!: drop Node 20')
subject_fail=('decide configs architecture' 'docs:decide' 'docs:  decide' 'docs(): decide' 'docs (configs): decide'
  'fix bug: crash' 'docs(configs: decide')

# Examples are run through the same checks, so they cannot drift from the rules
examples() {
  local ok=$1 problems=$2 kind=$3 verdict reason x
  shift 3
  for x in "$@"; do
    reason=$($problems "$x" | head -1)
    if $ok "$x"; then verdict='✓' reason=''; else verdict='✗'; fi
    if [[ ($kind == pass && $verdict == '✗') || ($kind == fail && $verdict == '✓') ]]; then
      echo "::error::check-names.sh: example '$x' should $kind but does not, fix the examples"
      exit 2
    fi
    if [[ -z $reason ]]; then printf '    %s %s\n' "$verdict" "$x"; else printf '    %s %-36s %s\n' "$verdict" "$x" "$reason"; fi
  done
}

# Workflow commands need %, CR and LF encoded
annotate() {
  local msg=$2
  msg=${msg//%/%25} msg=${msg//$'\r'/%0D} msg=${msg//$'\n'/%0A}
  echo "::error title=$1::$msg"
}

failed=()
report() {
  local label=$1 value=$2 ok=$3 problems=$4 reasons
  if $ok "$value"; then
    printf '✓ %s: "%s"\n' "$label" "$value"
    return
  fi
  reasons=$($problems "$value")
  [[ -z $reasons ]] && reasons="does not match the rule below"
  printf '✗ %s: "%s"\n%s\n' "$label" "$value" "$(sed 's/^/    - /' <<<"$reasons")"
  annotate "$label is invalid" "\"$value\""$'\n'"$reasons"
  failed+=("$label")
}

report 'Branch' "$branch" branch_ok branch_problems
report 'PR title' "$title" subject_ok subject_problems
# Merge commits keep every commit in history, so each subject must follow the same rule as the title
while IFS= read -r line; do
  report "Commit ${line%% *}" "${line#* }" subject_ok subject_problems
done < <(git log --no-merges --format='%h %s' "$range")

((${#failed[@]} == 0)) && exit 0

fixes() {
  local all=" ${failed[*]} "
  [[ $all == *" PR title "* ]] && echo '  PR title  gh pr edit <number> --title "<type>: <description>"   (CI re-runs on rename)'
  [[ $all == *" Commit "* ]] &&
    echo "  Commits   git rebase -i ${range%%..*}, mark them 'reword', then git push --force-with-lease"
  [[ $all == *" Branch "* ]] &&
    echo '  Branch    git branch -m <type>/<kebab-case> && git push -u origin HEAD, then open a new PR from it'
  return 0
}

cat <<EOF

${#failed[@]} name(s) break the rules: $(printf '%s\n' "${failed[@]}" | paste -sd, - | sed 's/,/, /g')

Rules (docs/development.md#branches-and-pull-requests)
  Branch          <type>/<kebab-case>, ≤ $max_branch chars, lowercase only; 'staging' is exempt
                  $branch_re
  Title, commits  <type>[(<scope>)][!]: <description>, ≤ $max_subject chars; type and scope in any case
                  $subject_re

Branch examples
$(examples branch_ok branch_problems pass "${branch_pass[@]}")
$(examples branch_ok branch_problems fail "${branch_fail[@]}")

Title and commit examples
$(examples subject_ok subject_problems pass "${subject_pass[@]}")
$(examples subject_ok subject_problems fail "${subject_fail[@]}")

How to fix
$(fixes)
EOF
exit 1
