#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const appDir = path.join(process.cwd(), "apps", "web", "app");
const routes = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    if (entry.isFile() && entry.name === "page.tsx") {
      const route =
        `/${path.relative(appDir, dir).replace(/\\/g, "/")}`.replace(/\/$/, "");
      routes.push(route === "/" ? "/" : route);
    }
  }
}
walk(appDir);
const required = [
  "/system/release-readiness",
  "/system/jobs",
  "/pricing",
  "/support",
  "/settings/subscription",
  "/super-admin/saas",
];
const missing = required.filter((route) => !routes.includes(route));
for (const route of routes.sort()) console.log(`ROUTE\t${route}`);
if (missing.length) {
  console.error(`FAIL\tmissing_routes\t${missing.join(",")}`);
  process.exit(1);
}
console.log(`PASS\troute_crawl\t${routes.length} routes discovered`);
