const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();
const ignored = new Set([".git", "node_modules", ".next", "dist", "generated", "coverage", "test-results", "playwright-report"]);
const patterns = [
  /sk-[A-Za-z0-9_-]{20,}/,
  /BEGIN (RSA|OPENSSH|PRIVATE) KEY/,
  /DATABASE_URL=postgresql:\/\/[^\s]+:[^\s@]+@/,
  /JWT_(ACCESS|REFRESH)_SECRET=(?!replace-|dev-|ci-)[^\s]{16,}/,
  /CODE_RUNNER_INTERNAL_TOKEN=(?!replace-|$)[^\s]+/,
];

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (ignored.has(entry.name) || entry.name.endsWith(".log")) return [];
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(absolute);
    return [absolute];
  });
}

const hits = [];
for (const file of walk(root)) {
  const rel = path.relative(root, file);
  if (
    rel === ".env" ||
    rel.endsWith(".dump") ||
    rel.endsWith(".bak") ||
    rel.endsWith(".example") ||
    rel === path.join("scripts", "secret-scan.js")
  ) {
    continue;
  }
  const content = fs.readFileSync(file, "utf8");
  if (patterns.some((pattern) => pattern.test(content))) hits.push(rel);
}

if (hits.length) {
  throw new Error(`Potential secret patterns found in: ${hits.join(", ")}`);
}
console.log("Secret scan passed.");
