#!/usr/bin/env bash
set -Eeuo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPORT_DIR="${LINT_REPORT_DIR:-${ROOT_DIR}/tmp/lint-reports}"
mkdir -p "${REPORT_DIR}" "${ROOT_DIR}/tmp"

timestamp="$(date -u +%Y%m%dT%H%M%SZ)"
report_file="${REPORT_DIR}/eslint-report-${timestamp}.json"
summary_file="${REPORT_DIR}/eslint-summary-${timestamp}.txt"
latest_file="${ROOT_DIR}/tmp/eslint-report.json"

targets=(
  src
  scripts
  bundle.js
  drizzle.config.ts
  eslint.config.js
  postcss.config.js
  tailwind.config.js
  vite.config.ts
)

echo "Generating full ESLint report..."
set +e
(
  cd "${ROOT_DIR}"
  npx eslint "${targets[@]}" -f json -o "${report_file}"
)
eslint_status=$?
set -e

cp "${report_file}" "${latest_file}"

node - "${report_file}" "${summary_file}" "${eslint_status}" <<'NODE'
const fs = require('node:fs');
const [reportPath, summaryPath, statusText] = process.argv.slice(2);

const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
let errorCount = 0;
let warningCount = 0;
let filesWithIssues = 0;
const ruleCounts = new Map();

for (const file of report) {
  const fileErrors = file.errorCount || 0;
  const fileWarnings = file.warningCount || 0;

  errorCount += fileErrors;
  warningCount += fileWarnings;

  if (fileErrors > 0 || fileWarnings > 0) {
    filesWithIssues += 1;
  }

  for (const message of file.messages || []) {
    if (!message.ruleId) continue;
    ruleCounts.set(message.ruleId, (ruleCounts.get(message.ruleId) || 0) + 1);
  }
}

const topRules = Array.from(ruleCounts.entries())
  .sort((a, b) => b[1] - a[1])
  .slice(0, 10)
  .map(([rule, count]) => `${rule}:${count}`)
  .join(', ');

const summaryLines = [
  `timestamp=${new Date().toISOString()}`,
  `eslint_exit_code=${statusText}`,
  `files_scanned=${report.length}`,
  `files_with_issues=${filesWithIssues}`,
  `errors=${errorCount}`,
  `warnings=${warningCount}`,
  `top_rules=${topRules || 'none'}`,
];

fs.writeFileSync(summaryPath, `${summaryLines.join('\n')}\n`, 'utf8');
console.log(summaryLines.join('\n'));
NODE

echo "Lint JSON report: ${report_file}"
echo "Lint summary: ${summary_file}"
echo "Latest report symlink file: ${latest_file}"
exit 0
