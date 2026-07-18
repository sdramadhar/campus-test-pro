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
      await this.prisma.$queryRaw`SELECT 1`;
      return "ok";
    } catch {
      return "error";
    }
  }

  private async checkRedis(): Promise<DependencyStatus> {
    try {
      await this.redis.client.ping();
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
      const heartbeat = await this.prisma.workerHeartbeat.findFirst({
        where: { service: "worker", expiresAt: { gt: new Date() } },
        orderBy: { lastSeenAt: "desc" },
      });
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
      await this.redis.client.set(key, "ok", "EX", 30);
      return (await this.redis.client.get(key)) === "ok" ? "ok" : "error";
    } catch {
      return "error";
    }
  }

  private async checkMigrations(): Promise<DependencyStatus> {
    try {
      await this.prisma
        .$queryRaw`SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL`;
      return "ok";
    } catch {
      return "error";
    }
  }
}
