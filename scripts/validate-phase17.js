const fs = require("node:fs");
const path = require("node:path");

const root = process.cwd();

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function walk(dir) {
  const absolute = path.join(root, dir);
  if (!fs.existsSync(absolute)) return [];
  return fs.readdirSync(absolute, { withFileTypes: true }).flatMap((entry) => {
    const rel = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(rel) : [rel];
  });
}

const dockerfiles = [
  "Dockerfile.api",
  "Dockerfile.web",
  "Dockerfile.worker",
  "apps/code-runner-gateway/Dockerfile",
];

for (const file of dockerfiles) {
  const content = read(file);
  assert(content.includes("npm ci"), `${file} must use deterministic npm ci`);
  assert(content.includes("USER "), `${file} must set a non-root runtime user`);
  assert(content.includes("HEALTHCHECK"), `${file} must define a health check`);
  assert(!content.includes("COPY .env"), `${file} must not copy env files`);
  assert(content.includes("org.opencontainers.image.revision"), `${file} must include immutable image labels`);
}

const manifests = walk("infrastructure/kubernetes").filter((file) =>
  /\.(ya?ml)$/.test(file),
);
assert(manifests.length > 0, "Kubernetes manifests are required");

for (const file of manifests) {
  const content = read(file);
  assert(!/password:\s*[^<\s]/i.test(content), `${file} must not embed passwords`);
  assert(!/(^|\n)\s*(token|accessToken|refreshToken):\s*[^<\s]/i.test(content), `${file} must not embed tokens`);
  assert(!/DATABASE_URL:\s*postgres/i.test(content), `${file} must not embed database URLs`);
}

const services = manifests
  .map((file) => read(file))
  .join("\n---\n");
assert(!/name:\s*(postgres|redis)[\s\S]{0,200}type:\s*LoadBalancer/i.test(services), "Database and Redis services must not be public LoadBalancers");
assert(services.includes("kind: NetworkPolicy"), "NetworkPolicy foundation is required");
assert(services.includes("kind: HorizontalPodAutoscaler"), "HPA foundation is required");
assert(services.includes("kind: PodDisruptionBudget"), "PDB foundation is required");

for (const file of [
  "infrastructure/monitoring/prometheus/prometheus.yml",
  "infrastructure/monitoring/grafana/provisioning/dashboards/campustest.yml",
  "infrastructure/proxy/nginx.conf",
]) {
  assert(fs.existsSync(path.join(root, file)), `${file} is required`);
}

const backupScript = read("scripts/backup-postgres.ps1");
assert(backupScript.includes("DIRECT_DATABASE_URL"), "backup script must require direct database URL");
assert(!backupScript.includes("postgresql://"), "backup script must not embed database credentials");

console.log("Phase 17 infrastructure validation passed.");
