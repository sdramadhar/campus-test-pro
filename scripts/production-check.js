#!/usr/bin/env node
const fs = require("node:fs");
const path = require("node:path");

const mode = process.argv.includes("--example") ? "example" : "environment";
const repo = process.cwd();
const envFile = mode === "example" ? ".env.production.example" : ".env";

function parseEnv(file) {
  const values = {};
  const fullPath = path.join(repo, file);
  if (!fs.existsSync(fullPath)) return values;
  for (const line of fs.readFileSync(fullPath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const index = trimmed.indexOf("=");
    values[trimmed.slice(0, index)] = trimmed.slice(index + 1);
  }
  return values;
}

const env = { ...process.env, ...parseEnv(envFile) };
const results = [];

function has(name) {
  return typeof env[name] === "string" && env[name].trim().length > 0;
}

function add(status, key, message) {
  results.push({ status, key, message });
}

function requireValue(name, message) {
  add(has(name) ? "PASS" : "FAIL", name, message);
}

function rejectValue(name, forbidden, message) {
  add(env[name] === forbidden ? "FAIL" : "PASS", name, message);
}

requireValue("APP_ENV", "APP_ENV must be set.");
add(
  env.APP_ENV === "production" ? "PASS" : "FAIL",
  "APP_ENV",
  "Production check requires APP_ENV=production.",
);
requireValue("DATABASE_URL", "Pooled database URL is required.");
requireValue(
  "DIRECT_DATABASE_URL",
  "Direct migration database URL is required.",
);
requireValue("REDIS_URL", "Redis URL is required.");
requireValue("JWT_ACCESS_SECRET", "JWT access secret is required.");
requireValue("JWT_REFRESH_SECRET", "JWT refresh secret is required.");
rejectValue(
  "JWT_ACCESS_SECRET",
  "dev-access-secret-change-me",
  "Default JWT access secret is forbidden.",
);
rejectValue(
  "JWT_REFRESH_SECRET",
  "dev-refresh-secret-change-me",
  "Default JWT refresh secret is forbidden.",
);
requireValue("APP_ENCRYPTION_KEY", "Application encryption key is required.");
requireValue("FRONTEND_URL", "Frontend URL is required.");
requireValue("API_URL", "API URL is required.");
requireValue("CORS_ORIGINS", "Explicit CORS origins are required.");
requireValue("TRUSTED_PROXIES", "Trusted proxies must be explicit.");
add(
  env.COOKIE_SECURE === "true" ? "PASS" : "FAIL",
  "COOKIE_SECURE",
  "Production cookies must be secure.",
);
rejectValue(
  "BILLING_PROVIDER",
  "MOCK",
  "Mock billing is forbidden in production.",
);
requireValue(
  "BILLING_WEBHOOK_SECRET",
  "Billing webhook secret is required when billing can be enabled.",
);
rejectValue(
  "EMAIL_PROVIDER",
  "console",
  "Console email is forbidden in production.",
);
rejectValue(
  "STORAGE_PROVIDER",
  "local",
  "Local object storage is forbidden in production.",
);
requireValue("BACKUP_PROVIDER", "Backup provider is required.");
if (env.BACKUP_PROVIDER && env.BACKUP_PROVIDER !== "disabled") {
  requireValue("BACKUP_BUCKET", "Backup bucket/container is required.");
} else {
  add("WARNING", "BACKUP_PROVIDER", "Automated backups are disabled.");
}
rejectValue("AI_PROVIDER", "mock", "Mock AI is forbidden in production.");
rejectValue(
  "CODE_RUNNER_MODE",
  "MOCK",
  "Mock code runner is forbidden in production.",
);
if (env.OTEL_ENABLED === "true") {
  requireValue(
    "OTEL_EXPORTER_ENDPOINT",
    "Monitoring/exporter endpoint is required when OpenTelemetry is enabled.",
  );
} else {
  add("WARNING", "OTEL_ENABLED", "OpenTelemetry export is disabled.");
}
requireValue(
  "ERROR_TRACKING_DSN",
  "Sentry-compatible error tracking DSN is required.",
);

if (env.BILLING_ENABLED === "true") {
  requireValue(
    "BILLING_SECRET_KEY",
    "Billing secret key is required when billing is enabled.",
  );
}
if (
  env.AI_FEATURE_ENABLED === "true" &&
  !["ollama", "mock"].includes(env.AI_PROVIDER || "")
) {
  add(
    has("AI_API_KEY") ||
      has("OPENAI_API_KEY") ||
      has("GOOGLE_GEMINI_API_KEY") ||
      has("ANTHROPIC_API_KEY") ||
      has("AZURE_OPENAI_API_KEY")
      ? "PASS"
      : "WARNING",
    "AI_API_KEY",
    "Configured AI provider will remain unavailable until a server-side key is set.",
  );
}
if (env.PUSH_PROVIDER && env.PUSH_PROVIDER !== "disabled") {
  requireValue("PUSH_PUBLIC_KEY", "Push public key is required.");
  requireValue("PUSH_PRIVATE_KEY", "Push private key is required.");
} else {
  add("WARNING", "PUSH_PROVIDER", "Push notifications are disabled.");
}

const failCount = results.filter((result) => result.status === "FAIL").length;
const warningCount = results.filter(
  (result) => result.status === "WARNING",
).length;
for (const result of results) {
  console.log(`${result.status}\t${result.key}\t${result.message}`);
}
console.log(
  `SUMMARY\t${failCount === 0 ? "PASS" : "FAIL"}\t${failCount} fail, ${warningCount} warning`,
);
process.exitCode = failCount === 0 ? 0 : 1;
