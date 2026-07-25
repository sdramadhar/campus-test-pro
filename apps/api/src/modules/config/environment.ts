import { z } from "zod";

const optionalUrl = z.url().optional().or(z.literal(""));

export const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "staging", "production"])
      .default("development"),
    APP_ENV: z
      .enum(["local", "test", "staging", "production"])
      .default("local"),
    APP_VERSION: z.string().optional(),
    GIT_COMMIT_SHA: z.string().optional(),
    API_PORT: z.coerce.number().int().positive().default(4000),
    PORT: z.coerce.number().int().positive().optional(),
    API_URL: optionalUrl,
    DATABASE_URL: z.string().min(1),
    DIRECT_DATABASE_URL: z.string().optional(),
    REDIS_URL: z.string().min(1),
    INTERNAL_SERVICE_TOKEN: z.string().optional(),
    JWT_ACCESS_SECRET: z.string().min(16),
    JWT_REFRESH_SECRET: z.string().min(16),
    ACCESS_TOKEN_TTL_SECONDS: z.coerce.number().int().positive().default(900),
    REFRESH_TOKEN_TTL_SECONDS: z.coerce
      .number()
      .int()
      .positive()
      .default(604800),
    COOKIE_SECURE: z
      .enum(["true", "false"])
      .default("false")
      .transform((value) => value === "true"),
    COOKIE_DOMAIN: z.string().optional(),
    CORS_ORIGINS: z.string().optional(),
    WEB_ORIGIN: z.string().optional(),
    FRONTEND_URL: optionalUrl,
    EMAIL_PROVIDER: z
      .enum(["console", "smtp", "resend", "sendgrid", "ses"])
      .default("console"),
    EMAIL_FROM: z
      .string()
      .default("CampusTest Pro <no-reply@campustest.local>"),
    SMTP_URL: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    SENDGRID_API_KEY: z.string().optional(),
    AWS_REGION: z.string().optional(),
    LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
    OTEL_ENABLED: z.enum(["true", "false"]).default("false"),
    OTEL_EXPORTER_ENDPOINT: z.string().optional(),
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
    STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default("storage"),
    STORAGE_BUCKET: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    OBJECT_STORAGE_ENDPOINT: z.string().optional(),
    OBJECT_STORAGE_BUCKET: z.string().optional(),
    OBJECT_STORAGE_REGION: z.string().optional(),
    OBJECT_STORAGE_ACCESS_KEY: z.string().optional(),
    OBJECT_STORAGE_SECRET_KEY: z.string().optional(),
    CODE_RUNNER_MODE: z
      .string()
      .default("DISABLED")
      .transform((value) => value.toUpperCase().replace("EXTERNAL", "REMOTE_RUNNER"))
      .pipe(z.enum(["DISABLED", "MOCK", "DOCKER_ISOLATED", "REMOTE_RUNNER"])),
    CODE_RUNNER_URL: z.string().optional(),
    CODE_RUNNER_INTERNAL_TOKEN: z.string().optional(),
    CODE_RUNNER_QUEUE: z.string().default("code-execution"),
    CODE_RUNNER_INTERNAL_URL: z.string().optional(),
    CODE_RUNNER_TIMEOUT_MS: z.coerce.number().int().positive().default(5000),
    CODE_RUNNER_MAX_SOURCE_BYTES: z.coerce.number().int().positive().default(65536),
    CODE_RUNNER_MAX_STDIN_BYTES: z.coerce.number().int().positive().default(8192),
    CODE_RUNNER_MAX_OUTPUT_BYTES: z.coerce.number().int().positive().default(65536),
    CODE_RUNNER_DEFAULT_CPU_LIMIT: z.string().default("0.5"),
    CODE_RUNNER_DEFAULT_MEMORY_MB: z.coerce.number().int().positive().default(256),
    CODE_RUNNER_DEFAULT_PROCESS_LIMIT: z.coerce.number().int().positive().default(64),
    CODE_RUNNER_ALLOWED_LANGUAGES: z.string().default("python,javascript,typescript,c,cpp,java,go,csharp,kotlin,rust"),
    AI_FEATURE_ENABLED: z.enum(["true", "false"]).default("true"),
    AI_PROVIDER: z
      .enum(["mock", "openai", "gemini", "anthropic", "azure-openai", "ollama"])
      .default("mock"),
    AI_ALLOW_MOCK_IN_NON_PRODUCTION: z.enum(["true", "false"]).default("true"),
    AI_API_KEY: z.string().optional(),
    AI_MODEL: z.string().default("campustest-mock-v1"),
    AI_TEMPERATURE: z.coerce.number().min(0).max(2).default(0.2),
    AI_MAX_OUTPUT_TOKENS: z.coerce.number().int().positive().default(1200),
    AI_EMBEDDING_MODEL: z.string().default("text-embedding-3-small"),
    AI_REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
    AI_MAX_RETRIES: z.coerce.number().int().min(0).max(5).default(2),
    AI_DAILY_LIMIT: z.coerce.number().int().positive().default(100),
    AI_MONTHLY_LIMIT: z.coerce.number().int().positive().default(2000),
    AI_MAX_QUESTIONS_PER_REQUEST: z.coerce.number().int().positive().default(10),
    AI_DOCUMENT_MAX_BYTES: z.coerce.number().int().positive().default(5242880),
    AI_DOCUMENT_RETENTION_DAYS: z.coerce.number().int().positive().default(7),
    OPENAI_API_KEY: z.string().optional(),
    GOOGLE_GEMINI_API_KEY: z.string().optional(),
    ANTHROPIC_API_KEY: z.string().optional(),
    AZURE_OPENAI_API_KEY: z.string().optional(),
    AZURE_OPENAI_ENDPOINT: z.string().optional(),
    AZURE_OPENAI_DEPLOYMENT: z.string().optional(),
    AZURE_OPENAI_API_VERSION: z.string().default("2024-02-15-preview"),
    OLLAMA_BASE_URL: z.string().default("http://localhost:11434"),
    OCR_PROVIDER: z.enum(["none", "tesseract"]).default("none"),
    TESSERACT_BINARY_PATH: z.string().default("tesseract"),
    BILLING_ENABLED: z.enum(["true", "false"]).default("false"),
    BILLING_PROVIDER: z
      .enum(["DISABLED", "MOCK", "STRIPE", "RAZORPAY"])
      .default("DISABLED"),
    BILLING_PUBLIC_KEY: z.string().optional(),
    BILLING_SECRET_KEY: z.string().optional(),
    BILLING_WEBHOOK_SECRET: z.string().optional(),
    BILLING_CURRENCY: z.string().default("USD"),
    BILLING_SUCCESS_URL: optionalUrl,
    BILLING_CANCEL_URL: optionalUrl,
    BILLING_PORTAL_RETURN_URL: optionalUrl,
    TRIAL_DAYS: z.coerce.number().int().positive().default(14),
    MOBILE_MIN_SUPPORTED_VERSION: z.string().default("0.1.0"),
    PWA_ENABLED: z.enum(["true", "false"]).default("true"),
    PUSH_PROVIDER: z.enum(["disabled", "web-push", "fcm"]).default("disabled"),
    PUSH_PUBLIC_KEY: z.string().optional(),
    PUSH_PRIVATE_KEY: z.string().optional(),
    SWAGGER_ENABLED: z.enum(["true", "false"]).default("true"),
    MAINTENANCE_MODE: z.enum(["true", "false"]).default("false"),
    ALLOW_ADMIN_DURING_MAINTENANCE: z.enum(["true", "false"]).default("true"),
    FEATURE_FLAGS: z.string().default("{}"),
    RELEASE_VERSION: z.string().default("0.1.0"),
    COMMIT_SHA: z.string().default("local"),
    BUILD_TIMESTAMP: z.string().default(new Date(0).toISOString()),
    ERROR_TRACKING_DSN: z.string().optional(),
    SENTRY_DSN: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    const strictEnvironment =
      env.NODE_ENV === "staging" ||
      env.NODE_ENV === "production" ||
      env.APP_ENV === "staging" ||
      env.APP_ENV === "production";
    if (strictEnvironment && !env.FRONTEND_URL && !env.WEB_ORIGIN) {
      ctx.addIssue({
        code: "custom",
        path: ["FRONTEND_URL"],
        message: "Staging and production require an explicit frontend URL.",
      });
    }
    if (strictEnvironment && !env.API_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["API_URL"],
        message: "Staging and production require an explicit API URL.",
      });
    }
    if (strictEnvironment && !env.DIRECT_DATABASE_URL) {
      ctx.addIssue({
        code: "custom",
        path: ["DIRECT_DATABASE_URL"],
        message: "Staging and production require a direct migration database URL.",
      });
    }
    if (strictEnvironment && !env.INTERNAL_SERVICE_TOKEN) {
      ctx.addIssue({
        code: "custom",
        path: ["INTERNAL_SERVICE_TOKEN"],
        message: "Staging and production require an internal service token.",
      });
    }
    if (
      strictEnvironment &&
      env.STORAGE_PROVIDER === "s3" &&
      !(
        (env.STORAGE_BUCKET || env.OBJECT_STORAGE_BUCKET) &&
        (env.S3_REGION || env.OBJECT_STORAGE_REGION)
      )
    ) {
      ctx.addIssue({
        code: "custom",
        path: ["OBJECT_STORAGE_BUCKET"],
        message: "S3-compatible object storage requires bucket and region.",
      });
    }
    if (env.NODE_ENV === "production" || env.APP_ENV === "production") {
      const forbiddenSecrets = new Set([
        "dev-access-secret-change-me",
        "dev-refresh-secret-change-me",
      ]);
      if (forbiddenSecrets.has(env.JWT_ACCESS_SECRET)) {
        ctx.addIssue({
          code: "custom",
          path: ["JWT_ACCESS_SECRET"],
          message: "Production JWT access secret must be replaced.",
        });
      }
      if (forbiddenSecrets.has(env.JWT_REFRESH_SECRET)) {
        ctx.addIssue({
          code: "custom",
          path: ["JWT_REFRESH_SECRET"],
          message: "Production JWT refresh secret must be replaced.",
        });
      }
      if (!env.COOKIE_SECURE) {
        ctx.addIssue({
          code: "custom",
          path: ["COOKIE_SECURE"],
          message: "Production cookies must be Secure.",
        });
      }
      if (!env.CORS_ORIGINS && !env.FRONTEND_URL) {
        ctx.addIssue({
          code: "custom",
          path: ["CORS_ORIGINS"],
          message: "Production CORS origins must be explicit.",
        });
      }
      if (env.SWAGGER_ENABLED === "true") {
        ctx.addIssue({
          code: "custom",
          path: ["SWAGGER_ENABLED"],
          message: "Disable or protect Swagger in production.",
        });
      }
      if (env.CODE_RUNNER_MODE === "MOCK") {
        ctx.addIssue({
          code: "custom",
          path: ["CODE_RUNNER_MODE"],
          message: "Mock code runner is not allowed in production.",
        });
      }
      if (
        env.CODE_RUNNER_MODE === "REMOTE_RUNNER" &&
        (!env.CODE_RUNNER_URL || !env.CODE_RUNNER_INTERNAL_TOKEN)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["CODE_RUNNER_URL"],
          message: "Remote code runner requires URL and internal token.",
        });
      }
      if (env.AI_PROVIDER === "mock") {
        ctx.addIssue({
          code: "custom",
          path: ["AI_PROVIDER"],
          message: "Mock AI provider is not allowed in production.",
        });
      }
      if (
        env.AI_FEATURE_ENABLED === "true" &&
        env.AI_PROVIDER !== "mock" &&
        env.AI_PROVIDER !== "ollama" &&
        !env.AI_API_KEY &&
        !env.OPENAI_API_KEY &&
        !env.GOOGLE_GEMINI_API_KEY &&
        !env.ANTHROPIC_API_KEY &&
        !env.AZURE_OPENAI_API_KEY
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["AI_API_KEY"],
          message: "Configured AI provider requires a server-side API key.",
        });
      }
      if (
        env.AI_FEATURE_ENABLED === "true" &&
        env.AI_PROVIDER === "azure-openai" &&
        (!env.AZURE_OPENAI_ENDPOINT || !env.AZURE_OPENAI_DEPLOYMENT)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["AZURE_OPENAI_ENDPOINT"],
          message: "Azure OpenAI requires endpoint and deployment env vars.",
        });
      }
      if (env.EMAIL_PROVIDER !== "console" && !env.EMAIL_FROM) {
        ctx.addIssue({
          code: "custom",
          path: ["EMAIL_FROM"],
          message: "Email sender is required.",
        });
      }
      if (env.BILLING_PROVIDER === "MOCK") {
        ctx.addIssue({
          code: "custom",
          path: ["BILLING_PROVIDER"],
          message: "Mock billing provider is not allowed in production.",
        });
      }
      if (
        env.BILLING_ENABLED === "true" &&
        (env.BILLING_PROVIDER === "STRIPE" || env.BILLING_PROVIDER === "RAZORPAY") &&
        (!env.BILLING_SECRET_KEY || !env.BILLING_WEBHOOK_SECRET)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["BILLING_SECRET_KEY"],
          message: "Paid billing providers require server-side secret and webhook secrets.",
        });
      }
      if (
        env.PUSH_PROVIDER !== "disabled" &&
        (!env.PUSH_PUBLIC_KEY || !env.PUSH_PRIVATE_KEY)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["PUSH_PUBLIC_KEY"],
          message: "Push notifications require server-side provider keys.",
        });
      }
      if (
        env.STORAGE_PROVIDER === "s3" &&
        !(
          (env.STORAGE_BUCKET || env.OBJECT_STORAGE_BUCKET) &&
          (env.S3_REGION || env.OBJECT_STORAGE_REGION)
        )
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["OBJECT_STORAGE_BUCKET"],
          message: "S3 storage requires bucket and region.",
        });
      }
    }
  });

export type AppEnvironment = z.infer<typeof environmentSchema>;

let cached: AppEnvironment | null = null;

export function validateEnvironment(
  source: NodeJS.ProcessEnv = process.env,
): AppEnvironment {
  const parsed = environmentSchema.safeParse(source);
  if (!parsed.success) {
    const detail = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid CampusTest environment configuration. ${detail}`);
  }
  cached = parsed.data;
  return parsed.data;
}

export function env(): AppEnvironment {
  return cached ?? validateEnvironment();
}

export function corsOrigins(): string | string[] {
  const current = env();
  const raw =
    current.CORS_ORIGINS ??
    current.WEB_ORIGIN ??
    current.FRONTEND_URL ??
    "http://localhost:3000";
  return raw.includes(",")
    ? raw
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean)
    : raw;
}
