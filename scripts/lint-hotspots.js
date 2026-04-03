#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const reportPath =
  process.argv[2] || path.resolve(process.cwd(), "tmp/eslint-report.json");
const limit = Number(process.argv[3] || 40);

if (!fs.existsSync(reportPath)) {
  console.error(`Report not found: ${reportPath}`);
  process.exit(1);
}

const report = JSON.parse(fs.readFileSync(reportPath, "utf8"));
const byFile = [];

for (const file of report) {
  const warnings = (file.messages || []).filter((m) => m.severity === 1);
  if (warnings.length === 0) continue;

  const ruleCounts = new Map();
  for (const warning of warnings) {
    const ruleId = warning.ruleId || "(none)";
    ruleCounts.set(ruleId, (ruleCounts.get(ruleId) || 0) + 1);
  }

  byFile.push({
    file: file.filePath.replace(`${process.cwd()}/`, ""),
    total: warnings.length,
    rules: [...ruleCounts.entries()].sort((a, b) => b[1] - a[1]),
  });
}

byFile.sort((a, b) => b.total - a.total);

for (const entry of byFile.slice(0, limit)) {
  const topRules = entry.rules
    .slice(0, 3)
    .map(([ruleId, count]) => `${ruleId}:${count}`)
    .join(", ");

  console.log(
    `${String(entry.total).padStart(3, " ")}  ${entry.file}  ${topRules}`,
  );
}
