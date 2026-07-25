#!/usr/bin/env node
const dryRun = process.argv.includes("--dry-run");
if (!dryRun) {
  console.error(
    "FAIL\trestore_database\tUse --dry-run first; production restore requires explicit runbook approval.",
  );
  process.exit(1);
}
console.log(
  "PASS\trestore_database\tDry-run restore guard passed; no data was modified.",
);
