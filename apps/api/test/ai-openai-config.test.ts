import assert from "node:assert/strict";
import { AiProviderFactory } from "../src/modules/ai-workflows/providers/ai-provider.factory";
import { validateEnvironment } from "../src/modules/config/environment";

const productionEnv = {
  NODE_ENV: "production",
  APP_ENV: "production",
  API_URL: "https://campus-test-pro.onrender.com",
  DATABASE_URL: "postgresql://user:password@localhost:5432/campustest",
  DIRECT_DATABASE_URL: "postgresql://user:password@localhost:5432/campustest",
  REDIS_URL: "redis://localhost:6379",
  INTERNAL_SERVICE_TOKEN: "production-internal-service-token",
  JWT_ACCESS_SECRET: "production-access-secret-value",
  JWT_REFRESH_SECRET: "production-refresh-secret-value",
  COOKIE_SECURE: "true",
  CORS_ORIGINS: "https://campus-test-pro-web.vercel.app",
  TRUSTED_PROXIES: "loopback,linklocal,uniquelocal",
  APP_ENCRYPTION_KEY: "production-encryption-secret-value",
  FRONTEND_URL: "https://campus-test-pro-web.vercel.app",
  EMAIL_PROVIDER: "smtp",
  EMAIL_FROM: "CampusTest Pro <no-reply@campustest.local>",
  STORAGE_PROVIDER: "disabled",
  BACKUP_PROVIDER: "disabled",
  CODE_RUNNER_MODE: "DISABLED",
  AI_FEATURE_ENABLED: "true",
  AI_PROVIDER: "openai",
  AI_MODEL: "gpt-4.1-mini",
  BILLING_PROVIDER: "DISABLED",
  SWAGGER_ENABLED: "false",
};

function main(): void {
  validateEnvironment(productionEnv);

  const factory = new AiProviderFactory();
  let status = factory.providerStatus();
  assert.equal(status.featureEnabled, true);
  assert.equal(status.provider, "openai");
  assert.equal(status.model, "gpt-4.1-mini");
  assert.equal(status.configured, false);
  assert.match(String(status.configurationMessage), /OPENAI_API_KEY/);
  assert.throws(
    () => factory.getProvider(),
    /Set OPENAI_API_KEY in the API environment/,
  );

  validateEnvironment({
    ...productionEnv,
    AI_FEATURE_ENABLED: "false",
    OPENAI_API_KEY: "openai-key-placeholder-for-test",
  });
  status = factory.providerStatus();
  assert.equal(status.featureEnabled, true);
  assert.equal(status.configured, true);
  assert.equal(status.configurationMessage, null);
  assert.equal(factory.getProvider().name, "openai");
  assert.equal(factory.getProvider().model, "gpt-4.1-mini");

  console.log("OpenAI production configuration tests passed.");
}

main();
