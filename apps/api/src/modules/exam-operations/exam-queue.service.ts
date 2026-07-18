import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { Job, Queue } from "bullmq";
import Redis from "ioredis";
import { createHash } from "node:crypto";
import { BackgroundJobStatus } from "../../../generated/phase5-client";
import { PrismaService } from "../prisma/prisma.service";

export const queueNames = [
  "attempt-expiry",
  "attempt-auto-submit",
  "result-calculation",
  "result-publication",
  "notification",
  "analytics",
  "cleanup",
] as const;

export type QueueName = (typeof queueNames)[number];

@Injectable()
export class ExamQueueService implements OnModuleDestroy {
  private readonly connection: Redis;
  private readonly queues: Map<QueueName, Queue>;

  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {
    this.connection = new Redis(
      process.env.REDIS_URL ?? "redis://localhost:6379",
      {
        maxRetriesPerRequest: null,
        enableReadyCheck: false,
      },
    );
    this.queues = new Map(
      queueNames.map((name) => [
        name,
        new Queue(name, {
          connection: this.connection,
          prefix: "campustest",
        }),
      ]),
    );
  }

  async scheduleAttemptExpiry(
    attemptId: string,
    expiresAt: Date,
  ): Promise<string> {
    const delay = Math.max(0, expiresAt.getTime() - Date.now());
    const jobId = `attempt-expiry-${attemptId}`;
    await this.addJob(
      "attempt-expiry",
      "expire-attempt",
      { attemptId },
      jobId,
      delay,
    );
    return jobId;
  }

  async addJob(
    queueName: QueueName,
    jobName: string,
    payload: Record<string, string>,
    jobId: string,
    delay = 0,
  ): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.add(jobName, payload, {
      jobId,
      delay,
      attempts: 5,
      backoff: { type: "exponential", delay: 2000 },
      removeOnComplete: 500,
      removeOnFail: false,
    });
    await this.prisma.backgroundJobRecord.upsert({
      where: { queueName_jobId: { queueName, jobId } },
      update: {
        status:
          delay > 0 ? BackgroundJobStatus.DELAYED : BackgroundJobStatus.WAITING,
      },
      create: {
        queueName,
        jobId,
        jobName,
        status:
          delay > 0 ? BackgroundJobStatus.DELAYED : BackgroundJobStatus.WAITING,
        payloadHash: this.hash(payload),
      },
    });
  }

  async queueSummary() {
    const summaries = [];
    for (const name of queueNames) {
      const queue = this.getQueue(name);
      const counts = await queue.getJobCounts(
        "waiting",
        "active",
        "completed",
        "failed",
        "delayed",
        "paused",
      );
      summaries.push({ name, counts });
    }
    return summaries;
  }

  async retryFailed(queueName: QueueName, jobId: string): Promise<void> {
    const job = await this.findJob(queueName, jobId);
    await job.retry("failed");
    await this.prisma.backgroundJobRecord.updateMany({
      where: { queueName, jobId },
      data: { status: BackgroundJobStatus.WAITING, error: null },
    });
  }

  async removeFailed(queueName: QueueName, jobId: string): Promise<void> {
    const job = await this.findJob(queueName, jobId);
    await job.remove();
    await this.prisma.backgroundJobRecord.updateMany({
      where: { queueName, jobId },
      data: {
        status: BackgroundJobStatus.FAILED,
        error: "Removed by authorized operator.",
      },
    });
  }

  async pause(queueName: QueueName): Promise<void> {
    await this.getQueue(queueName).pause();
  }

  async resume(queueName: QueueName): Promise<void> {
    await this.getQueue(queueName).resume();
  }

  getQueue(name: QueueName): Queue {
    const queue = this.queues.get(name);
    if (!queue) {
      throw new Error(`Unknown queue ${name}`);
    }
    return queue;
  }

  async onModuleDestroy(): Promise<void> {
    await Promise.all([...this.queues.values()].map((queue) => queue.close()));
    await this.connection.quit();
  }

  private async findJob(queueName: QueueName, jobId: string): Promise<Job> {
    const job = await this.getQueue(queueName).getJob(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found in ${queueName}`);
    }
    return job;
  }

  private hash(payload: Record<string, string>): string {
    return createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  }
}
