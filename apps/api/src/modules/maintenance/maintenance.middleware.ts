import {
  Inject,
  Injectable,
  NestMiddleware,
  ServiceUnavailableException,
} from "@nestjs/common";
import { NextFunction, Request, Response } from "express";
import { Role } from "../../../generated/phase5-client";
import { PrismaService } from "../prisma/prisma.service";
import { env } from "../config/environment";
import { CookieRequest } from "../auth/auth.types";

@Injectable()
export class MaintenanceMiddleware implements NestMiddleware {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async use(
    request: Request,
    _response: Response,
    next: NextFunction,
  ): Promise<void> {
    if (request.path === "/health" || request.path === "/ready") {
      next();
      return;
    }

    const staticEnabled = env().MAINTENANCE_MODE === "true";
    const state = await this.prisma.maintenanceState.findUnique({
      where: { id: "global" },
    });
    const enabled = staticEnabled || Boolean(state?.enabled);
    if (!enabled) {
      next();
      return;
    }

    const role = (request as CookieRequest).user?.role;
    const adminsAllowed =
      state?.allowAdmins ?? env().ALLOW_ADMIN_DURING_MAINTENANCE === "true";
    if (
      adminsAllowed &&
      (role === Role.SUPER_ADMIN || role === Role.COLLEGE_ADMIN)
    ) {
      next();
      return;
    }

    throw new ServiceUnavailableException({
      message: state?.message ?? "CampusTest Pro is in maintenance mode.",
      maintenance: true,
    });
  }
}
