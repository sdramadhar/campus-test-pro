import { z } from "zod";

const optionalUrl = z.url().optional().or(z.literal(""));

export const environmentSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "test", "staging", "production"])
      .default("development"),
    API_PORT: z.coerce.number().int().positive().default(4000),
    PORT: z.coerce.number().int().positive().optional(),
    DATABASE_URL: z.string().min(1),
    DIRECT_DATABASE_URL: z.string().optional(),
    REDIS_URL: z.string().min(1),
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
    OTEL_EXPORTER_OTLP_ENDPOINT: z.string().optional(),
    STORAGE_PROVIDER: z.enum(["local", "s3"]).default("local"),
    STORAGE_LOCAL_DIR: z.string().default("storage"),
    STORAGE_BUCKET: z.string().optional(),
    S3_ENDPOINT: z.string().optional(),
    S3_REGION: z.string().optional(),
    S3_ACCESS_KEY_ID: z.string().optional(),
    S3_SECRET_ACCESS_KEY: z.string().optional(),
    CODE_RUNNER_MODE: z
      .enum(["disabled", "mock", "external"])
      .default("disabled"),
    CODE_RUNNER_QUEUE: z.string().default("code-execution"),
    CODE_RUNNER_INTERNAL_URL: z.string().optional(),
    SWAGGER_ENABLED: z.enum(["true", "false"]).default("true"),
    MAINTENANCE_MODE: z.enum(["true", "false"]).default("false"),
    ALLOW_ADMIN_DURING_MAINTENANCE: z.enum(["true", "false"]).default("true"),
    RELEASE_VERSION: z.string().default("0.1.0"),
    COMMIT_SHA: z.string().default("local"),
    BUILD_TIMESTAMP: z.string().default(new Date(0).toISOString()),
    SENTRY_DSN: z.string().optional(),
  })
  .superRefine((env, ctx) => {
    if (env.NODE_ENV === "production") {
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
      if (env.CODE_RUNNER_MODE === "mock") {
        ctx.addIssue({
          code: "custom",
          path: ["CODE_RUNNER_MODE"],
          message: "Mock code runner is not allowed in production.",
        });
      }
      if (env.EMAIL_PROVIDER !== "console" && !env.EMAIL_FROM) {
        ctx.addIssue({
          code: "custom",
          path: ["EMAIL_FROM"],
          message: "Email sender is required.",
        });
      }
      if (
        env.STORAGE_PROVIDER === "s3" &&
        (!env.STORAGE_BUCKET || !env.S3_REGION)
      ) {
        ctx.addIssue({
          code: "custom",
          path: ["STORAGE_BUCKET"],
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
