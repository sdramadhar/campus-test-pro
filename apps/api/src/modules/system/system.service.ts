import { Inject, Injectable } from "@nestjs/common";
import { AuthenticatedUser } from "../auth/auth.types";
import { env } from "../config/environment";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class SystemService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  version() {
    const current = env();
    return {
      application: "campustest-pro",
      version: current.RELEASE_VERSION,
      commitSha: current.COMMIT_SHA,
      buildTimestamp: current.BUILD_TIMESTAMP,
      environment: current.NODE_ENV,
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
    input: { enabled: boolean; message?: string; allowAdmins?: boolean },
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
        metadata: { enabled: input.enabled },
      },
    });
    return { success: true, data: state };
  }
}
