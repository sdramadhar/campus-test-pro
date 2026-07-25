import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { CodeExecutionStatus, RunnerMode } from "../../../generated/phase5-client";
import { AuthenticatedUser } from "../auth/auth.types";
import { env } from "../config/environment";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class CodeRunnerService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async submit(
    user: AuthenticatedUser,
    input: {
      questionId?: string;
      language: string;
      sourceCode: string;
      stdin?: string;
    },
  ) {
    const current = env();
    if (current.CODE_RUNNER_MODE === "DISABLED") {
      throw new ServiceUnavailableException(
        "Secure code execution is not configured.",
      );
    }
    if (
      current.NODE_ENV === "production" &&
      current.CODE_RUNNER_MODE === "MOCK"
    ) {
      throw new BadRequestException(
        "Mock code runner is not allowed in production.",
      );
    }
    const job = await this.prisma.codeExecutionJob.create({
      data: {
        collegeId: user.collegeId,
        userId: user.id,
        questionId: input.questionId,
        language: input.language,
        mode: current.CODE_RUNNER_MODE,
        status:
          current.CODE_RUNNER_MODE === "MOCK"
            ? CodeExecutionStatus.ACCEPTED
            : CodeExecutionStatus.PENDING,
        mockResult: current.CODE_RUNNER_MODE === "MOCK",
        inputHash: createHash("sha256")
          .update(`${input.language}:${input.sourceCode}:${input.stdin ?? ""}`)
          .digest("hex"),
        result:
          current.CODE_RUNNER_MODE === "MOCK"
            ? {
                label: "mock-development-result",
                stdout: "Mock runner accepted the submission.",
              }
            : undefined,
        finishedAt:
          current.CODE_RUNNER_MODE === "MOCK" ? new Date() : undefined,
      },
    });
    return {
      success: true,
      data: {
        id: job.id,
        status: job.status,
        mockResult: job.mockResult,
        message: job.mockResult
          ? "Mock result. No untrusted code was executed."
          : "Execution job queued.",
      },
    };
  }

  async get(user: AuthenticatedUser, id: string) {
    const job = await this.prisma.codeExecutionJob.findFirst({
      where: {
        id,
        ...(user.collegeId ? { collegeId: user.collegeId } : {}),
      },
    });
    if (!job || (job.userId !== user.id && user.role === "STUDENT")) {
      throw new ServiceUnavailableException("Execution job is unavailable.");
    }
    return {
      success: true,
      data: {
        id: job.id,
        status: job.status,
        mockResult: job.mockResult,
        result: job.result,
        error: job.error,
        queuedAt: job.queuedAt,
        finishedAt: job.finishedAt,
      },
    };
  }

  async health() {
    const current = env();
    const queueDepth = await this.prisma.runnerJob.count({ where: { status: { in: ["QUEUED", "DISPATCHED", "RUNNING"] } } }).catch(() => 0);
    const failedJobs = await this.prisma.runnerJob.count({ where: { status: "FAILED" } }).catch(() => 0);
    return {
      success: true,
      data: {
        mode: current.CODE_RUNNER_MODE,
        healthy: current.CODE_RUNNER_MODE !== "DISABLED",
        mock: current.CODE_RUNNER_MODE === "MOCK",
        queue: current.CODE_RUNNER_QUEUE,
        queueDepth,
        failedJobs,
        limits: {
          timeoutMs: current.CODE_RUNNER_TIMEOUT_MS,
          maxSourceBytes: current.CODE_RUNNER_MAX_SOURCE_BYTES,
          maxStdinBytes: current.CODE_RUNNER_MAX_STDIN_BYTES,
          maxOutputBytes: current.CODE_RUNNER_MAX_OUTPUT_BYTES,
          defaultMemoryMb: current.CODE_RUNNER_DEFAULT_MEMORY_MB,
          defaultProcessLimit: current.CODE_RUNNER_DEFAULT_PROCESS_LIMIT,
        },
      },
    };
  }

  async languages() {
    return {
      success: true,
      data: await this.prisma.programmingLanguage.findMany({
        where: { enabled: true },
        orderBy: { displayName: "asc" },
        select: {
          id: true,
          displayName: true,
          version: true,
          sourceExtension: true,
          defaultTimeLimitMs: true,
          defaultMemoryLimitMb: true,
          defaultProcessLimit: true,
          defaultOutputLimitBytes: true,
          compileRequired: true,
          starterCode: true,
        },
      }),
    };
  }

  async images() {
    return {
      success: true,
      data: await this.prisma.runnerImageVersion.findMany({
        orderBy: { createdAt: "desc" },
        take: 100,
        select: {
          id: true,
          languageId: true,
          imageIdentifier: true,
          active: true,
          deprecated: true,
          immutableTag: true,
          usageCount: true,
          createdAt: true,
        },
      }),
    };
  }

  mode(): RunnerMode {
    return env().CODE_RUNNER_MODE;
  }
}
