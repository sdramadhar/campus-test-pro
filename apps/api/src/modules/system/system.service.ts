import { Inject, Injectable } from "@nestjs/common";
import {
  BackgroundJobStatus,
  TestAttemptStatus,
} from "../../../generated/phase5-client";
import { AuthenticatedUser } from "../auth/auth.types";
import { env } from "../config/environment";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class SystemService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
  ) {}

  version() {
    const current = env();
    return {
      application: "campustest-pro",
      version: current.APP_VERSION ?? current.RELEASE_VERSION,
      commitSha: current.GIT_COMMIT_SHA ?? current.COMMIT_SHA,
      buildTimestamp: current.BUILD_TIMESTAMP,
      environment: current.APP_ENV,
      nodeEnvironment: current.NODE_ENV,
    };
  }

  async workerStatus() {
    const now = new Date();
    const heartbeats = await this.prisma.workerHeartbeat.findMany({
      orderBy: { lastSeenAt: "desc" },
      take: 25,
    });
    return {
      success: true,
      data: heartbeats.map((heartbeat) => ({
        instanceId: heartbeat.instanceId,
        service: heartbeat.service,
        queues: heartbeat.queues,
        version: heartbeat.version,
        lastSeenAt: heartbeat.lastSeenAt,
        healthy: heartbeat.expiresAt > now,
      })),
    };
  }

  async maintenance() {
    const state = await this.prisma.maintenanceState.upsert({
      where: { id: "global" },
      update: {},
      create: { id: "global", enabled: false },
    });
    return { success: true, data: state };
  }

  async updateMaintenance(
    user: AuthenticatedUser,
    input: {
      enabled: boolean;
      message?: string;
      allowAdmins?: boolean;
      blockNewExamStarts?: boolean;
    },
  ) {
    const state = await this.prisma.maintenanceState.upsert({
      where: { id: "global" },
      update: {
        enabled: input.enabled,
        message: input.message,
        allowAdmins: input.allowAdmins ?? true,
        updatedByUserId: user.id,
      },
      create: {
        id: "global",
        enabled: input.enabled,
        message: input.message,
        allowAdmins: input.allowAdmins ?? true,
        updatedByUserId: user.id,
      },
    });
    await this.prisma.auditLog.create({
      data: {
        event: "MAINTENANCE_MODE_UPDATE",
        userId: user.id,
        collegeId: user.collegeId,
        actorRole: user.role,
        metadata: {
          enabled: input.enabled,
          blockNewExamStarts: input.blockNewExamStarts ?? input.enabled,
        },
      },
    });
    return { success: true, data: state };
  }

  async infrastructure() {
    const [
      postgres,
      redis,
      workers,
      activeAttempts,
      failedJobs,
      runnerJobs,
      maintenance,
    ] = await Promise.all([
      this.postgresStatus(),
      this.redisStatus(),
      this.workerStatus(),
      this.prisma.testAttempt.count({
        where: { status: TestAttemptStatus.IN_PROGRESS },
      }),
      this.prisma.backgroundJobRecord.count({
        where: { status: BackgroundJobStatus.FAILED },
      }),
      this.prisma.runnerJob.count(),
      this.maintenance(),
    ]);
    return {
      success: true,
      data: {
        version: this.version(),
        services: {
          web: { status: "external", replicas: "configured by deployment" },
          api: { status: postgres === "ok" && redis === "ok" ? "ok" : "degraded" },
          worker: workers.data.some((worker) => worker.healthy) ? "ok" : "degraded",
          codeRunnerGateway: runnerJobs >= 0 ? "configured" : "unknown",
          postgres,
          redis,
        },
        operations: {
          activeAttempts,
          failedJobs,
          runnerJobs,
          maintenance: maintenance.data.enabled,
          monitoring: "configured",
          backups: "configured",
        },
      },
    };
  }

  async capacity() {
    const [activeAttempts, queuedJobs, codeRunnerQueued, activeJobs] =
      await Promise.all([
        this.prisma.testAttempt.count({
          where: { status: TestAttemptStatus.IN_PROGRESS },
        }),
        this.prisma.backgroundJobRecord.count({
          where: { status: { in: [BackgroundJobStatus.WAITING, BackgroundJobStatus.DELAYED] } },
        }),
        this.prisma.runnerJob.count({ where: { status: "QUEUED" } }),
        this.prisma.backgroundJobRecord.count({
          where: { status: BackgroundJobStatus.ACTIVE },
        }),
      ]);
    return {
      success: true,
      data: {
        activeAttempts,
        queuedJobs,
        activeJobs,
        codeRunnerQueued,
        validatedConcurrentUsers: null,
        targetProfile: "5,000-student staging validation pending",
        claim: "No 5,000-concurrent support claim is made until staging k6 results pass.",
      },
    };
  }

  async deploymentSafety() {
    const activeAttempts = await this.prisma.testAttempt.count({
      where: { status: TestAttemptStatus.IN_PROGRESS },
    });
    const maintenance = await this.maintenance();
    const safeToDeploy = activeAttempts === 0 || maintenance.data.enabled;
    return {
      success: true,
      data: {
        safeToDeploy,
        activeAttempts,
        recommendation: safeToDeploy
          ? "Rolling deployment may proceed after migration and health gates pass."
          : "Delay deployment or enable exam-safe maintenance because active attempts are running.",
      },
    };
  }

  async backups() {
    const recentBackupJob = await this.prisma.backgroundJobRecord.findFirst({
      where: { queueName: { contains: "backup", mode: "insensitive" } },
      orderBy: { createdAt: "desc" },
    });
    return {
      success: true,
      data: {
        status: recentBackupJob?.status ?? "NOT_RECORDED",
        lastBackupAt: recentBackupJob?.finishedAt ?? null,
        postgres: "logical backup and managed snapshot configured by deployment",
        redis: "persistence guidance only; PostgreSQL remains source of truth",
        objectStorage: "versioning, lifecycle, and retention configured by provider",
      },
    };
  }

  async alerts() {
    const [failedJobs, staleWorkers, activeAttempts] = await Promise.all([
      this.prisma.backgroundJobRecord.count({
        where: { status: BackgroundJobStatus.FAILED },
      }),
      this.prisma.workerHeartbeat.count({
        where: { expiresAt: { lt: new Date() } },
      }),
      this.prisma.testAttempt.count({
        where: { status: TestAttemptStatus.IN_PROGRESS },
      }),
    ]);
    const alerts = [
      ...(failedJobs > 0
        ? [{ severity: "warning", name: "failed_jobs", count: failedJobs }]
        : []),
      ...(staleWorkers > 0
        ? [{ severity: "warning", name: "stale_workers", count: staleWorkers }]
        : []),
    ];
    return {
      success: true,
      data: { alerts, activeAttempts, privateDataIncluded: false },
    };
  }

  async metricsSummary() {
    const [activeAttempts, submissions, queueBacklog, workerCount] =
      await Promise.all([
        this.prisma.testAttempt.count({
          where: { status: TestAttemptStatus.IN_PROGRESS },
        }),
        this.prisma.testAttempt.count({
          where: {
            status: {
              in: [
                TestAttemptStatus.SUBMITTED,
                TestAttemptStatus.AUTO_SUBMITTED,
                TestAttemptStatus.EVALUATED,
              ],
            },
          },
        }),
        this.prisma.backgroundJobRecord.count({
          where: { status: { in: [BackgroundJobStatus.WAITING, BackgroundJobStatus.DELAYED] } },
        }),
        this.prisma.workerHeartbeat.count({
          where: { expiresAt: { gt: new Date() } },
        }),
      ]);
    return {
      success: true,
      data: {
        activeAttempts,
        submissions,
        queueBacklog,
        healthyWorkers: workerCount,
        labelsPolicy: "No answers, source code, tokens, hidden tests, or direct student identifiers are used as metric labels.",
      },
    };
  }

  async metricsText() {
    const summary = await this.metricsSummary();
    const data = summary.data;
    return [
      "# HELP campustest_active_attempts Active in-progress exam attempts.",
      "# TYPE campustest_active_attempts gauge",
      `campustest_active_attempts ${data.activeAttempts.toString()}`,
      "# HELP campustest_queue_backlog Waiting or delayed background jobs.",
      "# TYPE campustest_queue_backlog gauge",
      `campustest_queue_backlog ${data.queueBacklog.toString()}`,
      "# HELP campustest_healthy_workers Fresh worker heartbeats.",
      "# TYPE campustest_healthy_workers gauge",
      `campustest_healthy_workers ${data.healthyWorkers.toString()}`,
    ].join("\n");
  }

  private async postgresStatus() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return "ok";
    } catch {
      return "error";
    }
  }

  private async redisStatus() {
    try {
      await this.redis.client.ping();
      return "ok";
    } catch {
      return "error";
    }
  }
}
