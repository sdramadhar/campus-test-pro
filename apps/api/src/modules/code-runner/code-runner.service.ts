import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from "@nestjs/common";
import { createHash } from "node:crypto";
import { CodeExecutionStatus } from "../../../generated/phase5-client";
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
    if (current.CODE_RUNNER_MODE === "disabled") {
      throw new ServiceUnavailableException(
        "Secure code execution is not configured.",
      );
    }
    if (
      current.NODE_ENV === "production" &&
      current.CODE_RUNNER_MODE === "mock"
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
          current.CODE_RUNNER_MODE === "mock"
            ? CodeExecutionStatus.ACCEPTED
            : CodeExecutionStatus.PENDING,
        mockResult: current.CODE_RUNNER_MODE === "mock",
        inputHash: createHash("sha256")
          .update(`${input.language}:${input.sourceCode}:${input.stdin ?? ""}`)
          .digest("hex"),
        result:
          current.CODE_RUNNER_MODE === "mock"
            ? {
                label: "mock-development-result",
                stdout: "Mock runner accepted the submission.",
              }
            : undefined,
        finishedAt:
          current.CODE_RUNNER_MODE === "mock" ? new Date() : undefined,
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
}
