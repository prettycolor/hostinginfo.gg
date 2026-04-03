#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OUTPUT_DIR="${QUALITY_BASELINE_DIR:-${ROOT_DIR}/tmp/quality-baseline}"
STRICT_MODE="${QUALITY_BASELINE_STRICT:-false}"

mkdir -p "${OUTPUT_DIR}"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
summary_file="${OUTPUT_DIR}/baseline-summary-${timestamp}.md"

declare -a step_names=()
declare -a step_statuses=()
declare -a step_durations=()
declare -a step_logs=()

run_step() {
  local name="$1"
  shift
  local log_file="${OUTPUT_DIR}/${timestamp}-${name}.log"
  local started_at
  local ended_at
  local status

  started_at="$(date +%s)"
  echo "[baseline] Running ${name}..."
  set +e
  (
    cd "${ROOT_DIR}"
    "$@"
  ) >"${log_file}" 2>&1
  status=$?
  set -e
  ended_at="$(date +%s)"

  step_names+=("${name}")
  step_statuses+=("${status}")
  step_durations+=("$((ended_at - started_at))")
  step_logs+=("${log_file}")
}

run_step "lint-report" npm run lint:report
run_step "type-check-critical" npm run type-check:critical
run_step "build" npm run build

{
  echo "# Quality Baseline (${timestamp})"
  echo
  echo "| Step | Exit Code | Duration (s) | Log |"
  echo "| --- | --- | --- | --- |"

  for i in "${!step_names[@]}"; do
    echo "| ${step_names[$i]} | ${step_statuses[$i]} | ${step_durations[$i]} | ${step_logs[$i]} |"
  done
} >"${summary_file}"

echo "Baseline summary: ${summary_file}"

failure_count=0
for status in "${step_statuses[@]}"; do
  if [[ "${status}" -ne 0 ]]; then
    failure_count=$((failure_count + 1))
  fi
done

if [[ "${STRICT_MODE}" == "true" && "${failure_count}" -gt 0 ]]; then
  echo "Baseline completed with ${failure_count} failing step(s) in strict mode."
  exit 1
fi

echo "Baseline completed with ${failure_count} failing step(s)."
exit 0
