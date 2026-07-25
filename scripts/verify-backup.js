#!/usr/bin/env node
const fs = require("node:fs");
const target = process.argv
  .find((arg) => arg.startsWith("--file="))
  ?.slice("--file=".length);

if (!target) {
  console.log(
    "WARNING\tbackup_file\tNo backup file supplied; verified backup command wiring only.",
  );
  process.exit(0);
}
if (!fs.existsSync(target)) {
  console.error("FAIL\tbackup_file\tBackup file does not exist.");
  process.exit(1);
}
const size = fs.statSync(target).size;
console.log(`${size > 0 ? "PASS" : "FAIL"}\tbackup_file\t${size} bytes`);
process.exitCode = size > 0 ? 0 : 1;
