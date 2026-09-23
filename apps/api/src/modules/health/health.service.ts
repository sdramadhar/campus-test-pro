import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

export type DependencyStatus = "ok" | "error";

export interface ReadinessResponse {
  status: DependencyStatus;
  dependencies: {
    postgres: DependencyStatus;
    redis: DependencyStatus;
    worker: DependencyStatus;
    queues: DependencyStatus;
    migrations: DependencyStatus;
  };
  timestamp: string;
}

@Injectable()
export class HealthService {
  private readonly dependencyTimeoutMs = Number(
    process.env.HEALTH_DEPENDENCY_TIMEOUT_MS ?? 2000,
  );

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  async ready(): Promise<ReadinessResponse> {
    const [postgres, redis, worker, queues, migrations] = await Promise.all([
      this.checkPostgres(),
      this.checkRedis(),
      this.checkWorker(),
      this.checkQueues(),
      this.checkMigrations(),
    ]);
    const status =
      postgres === "ok" &&
      redis === "ok" &&
      worker === "ok" &&
      queues === "ok" &&
      migrations === "ok"
        ? "ok"
        : "error";

    return {
      status,
      dependencies: { postgres, redis, worker, queues, migrations },
      timestamp: new Date().toISOString(),
    };
  }

  private async checkPostgres(): Promise<DependencyStatus> {
    try {
      await this.withTimeout(
        this.prisma.$queryRaw`SELECT 1`,
        "postgres health check",
      );
      return "ok";
    } catch {
      return "error";
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      await this.withTimeout(this.redis.client.ping(), "redis health check");
      return "ok";
    } catch {
      return "error";
    }
  }

  private async checkWorker(): Promise<DependencyStatus> {
    try {
      if (process.env.WORKER_REQUIRED === "false") {
        return "ok";
      }
      const heartbeat = await this.withTimeout(
        this.prisma.workerHeartbeat.findFirst({
          where: { service: "worker", expiresAt: { gt: new Date() } },
          orderBy: { lastSeenAt: "desc" },
        }),
        "worker health check",
      );
      if (heartbeat) {
        return "ok";
      }
      return process.env.NODE_ENV === "development" ? "ok" : "error";
    } catch {
      return "error";
    }
  }

  private async checkQueues(): Promise<DependencyStatus> {
    try {
      const key = "campustest:health:queues";
      await this.withTimeout(
        this.redis.client.set(key, "ok", "EX", 30),
        "queue write health check",
      );
      return (await this.withTimeout(
        this.redis.client.get(key),
        "queue read health check",
      )) === "ok"
        ? "ok"
        : "error";
    } catch {
      return "error";
    }
  }

  private async checkMigrations(): Promise<DependencyStatus> {
    try {
      await this.withTimeout(
        this.prisma
          .$queryRaw`SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`,
        "migration health check",
      );
      return "ok";
    } catch {
      return "error";
    }
  }

  private async withTimeout<T>(operation: Promise<T>, label: string): Promise<T> {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<never>((_resolve, reject) => {
      timeout = setTimeout(() => {
        reject(new Error(`${label} timed out.`));
      }, this.dependencyTimeoutMs);
    });

    try {
      return await Promise.race([operation, timeoutPromise]);
    } finally {
      if (timeout) {
        clearTimeout(timeout);
      }
    }
  }
}
