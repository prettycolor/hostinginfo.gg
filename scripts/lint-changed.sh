#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

BASE_REF="${LINT_CHANGED_BASE_REF:-origin/master}"

declare -a candidates=()

collect_files() {
  local command="$1"
  local -a files=()
  # shellcheck disable=SC2207
  files=($(eval "${command}"))
  if [[ ${#files[@]} -gt 0 ]]; then
    candidates+=("${files[@]}")
  fi
}

if git rev-parse --verify "${BASE_REF}" >/dev/null 2>&1; then
  collect_files "git diff --name-only --diff-filter=ACMRTUXB ${BASE_REF}...HEAD"
elif git rev-parse --verify HEAD~1 >/dev/null 2>&1; then
  collect_files "git diff --name-only --diff-filter=ACMRTUXB HEAD~1...HEAD"
fi

collect_files "git diff --name-only --diff-filter=ACMRTUXB"
collect_files "git diff --cached --name-only --diff-filter=ACMRTUXB"
collect_files "git ls-files --others --exclude-standard"

declare -A seen=()
declare -a lint_files=()

for file in "${candidates[@]}"; do
  [[ -n "${file}" ]] || continue
  [[ -f "${file}" ]] || continue
  case "${file}" in
    *.ts|*.tsx|*.js|*.mjs|*.cjs)
      if [[ -z "${seen["${file}"]:-}" ]]; then
        lint_files+=("${file}")
        seen["${file}"]=1
      fi
      ;;
  esac
done

if [[ ${#lint_files[@]} -eq 0 ]]; then
  echo "No changed lintable files detected."
  exit 0
fi

echo "Linting ${#lint_files[@]} changed file(s)..."
npx eslint "${lint_files[@]}"
