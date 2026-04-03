#!/usr/bin/env node

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

const ignoredPathPrefixes = [
  "docs/",
  "node_modules/",
  "dist/",
  "PHASE_2_BACKUP/",
];

const ignoredFiles = new Set([
  "env.example",
  "README.md",
  "DEPLOYMENT_PACKAGE.sh",
]);

const placeholderValuePattern =
  /^(REDACTED|your[-_]|change[-_]|generate[-_]|replace[-_]|example|sample|<.*>|\$\{.+\})/i;

const envAssignmentPattern = /^\s*(?:export\s+)?(SESSION_SECRET|JWT_SECRET)\s*=\s*([^\s"'`]+)/;
const systemdEnvPattern = /^\s*Environment=.*\b(SESSION_SECRET|JWT_SECRET)=([^\s"'`]+)/;

function isIgnoredFile(filePath) {
  return (
    ignoredFiles.has(filePath) ||
    ignoredPathPrefixes.some((prefix) => filePath.startsWith(prefix))
  );
}

function shouldFlagSecretValue(value) {
  if (!value || value.length < 16) return false;
  if (placeholderValuePattern.test(value)) return false;
  return true;
}

function getTrackedFiles() {
  const raw = execSync("git ls-files -z", { cwd: repoRoot, encoding: "utf8" });
  return raw.split("\0").filter(Boolean);
}

const findings = [];

for (const filePath of getTrackedFiles()) {
  if (isIgnoredFile(filePath)) {
    continue;
  }

  const absolutePath = path.join(repoRoot, filePath);
  let content;
  try {
    content = fs.readFileSync(absolutePath, "utf8");
  } catch {
    continue;
  }

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const envMatch = line.match(envAssignmentPattern);
    const systemdMatch = line.match(systemdEnvPattern);
    const match = envMatch || systemdMatch;

    if (!match) {
      continue;
    }

    const key = match[1];
    const value = match[2];
    if (!shouldFlagSecretValue(value)) {
      continue;
    }

    findings.push({
      filePath,
      line: i + 1,
      key,
    });
  }
}

if (findings.length > 0) {
  console.error("[security:scan-secrets] Potential unredacted secrets detected:");
  for (const finding of findings) {
    console.error(`- ${finding.filePath}:${finding.line} (${finding.key})`);
  }
  process.exit(1);
}

console.log("[security:scan-secrets] OK (no unredacted SESSION_SECRET/JWT_SECRET assignments found)");
