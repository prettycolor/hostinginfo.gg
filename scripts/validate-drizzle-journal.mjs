#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();
const drizzleDir = path.join(repoRoot, "drizzle");
const journalPath = path.join(drizzleDir, "meta", "_journal.json");

function fail(message) {
  console.error(`[db:validate] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(journalPath)) {
  fail(`Missing journal file: ${journalPath}`);
}

const journalRaw = fs.readFileSync(journalPath, "utf8");
const journal = JSON.parse(journalRaw);
const entries = Array.isArray(journal.entries) ? journal.entries : [];

const migrationTags = fs
  .readdirSync(drizzleDir)
  .filter((file) => /^\d{4}_.+\.sql$/i.test(file))
  .map((file) => file.replace(/\.sql$/i, ""))
  .sort();

if (migrationTags.length === 0) {
  fail("No SQL migrations found in drizzle/");
}

const journalTags = entries.map((entry) => entry.tag);

for (let i = 0; i < entries.length; i += 1) {
  if (entries[i].idx !== i) {
    fail(`Journal idx mismatch at position ${i}: expected ${i}, got ${entries[i].idx}`);
  }
}

const missingFromJournal = migrationTags.filter((tag) => !journalTags.includes(tag));
const missingSqlFile = journalTags.filter((tag) => !migrationTags.includes(tag));

if (missingFromJournal.length > 0) {
  fail(`Missing migration(s) in journal: ${missingFromJournal.join(", ")}`);
}

if (missingSqlFile.length > 0) {
  fail(`Journal references missing SQL migration(s): ${missingSqlFile.join(", ")}`);
}

const outOfOrder = migrationTags.some((tag, index) => journalTags[index] !== tag);
if (outOfOrder) {
  fail("Journal migration tag order does not match drizzle/*.sql order");
}

console.log(`[db:validate] OK (${migrationTags.length} migrations)`);
