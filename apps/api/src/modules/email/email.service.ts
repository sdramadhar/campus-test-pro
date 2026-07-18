import { Inject, Injectable } from "@nestjs/common";
import {
  AuditEvent,
  EmailDeliveryStatus,
  EmailProvider,
  Prisma,
} from "../../../generated/phase5-client";
import { PrismaService } from "../prisma/prisma.service";
import { env } from "../config/environment";

export type EmailTemplate =
  | "account-invitation"
  | "password-reset"
  | "assessment-assignment"
  | "assessment-reminder"
  | "submission-receipt"
  | "result-published"
  | "account-deactivated";

interface QueueEmailInput {
  toEmail: string;
  userId?: string | null;
  template: EmailTemplate;
  subject: string;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class EmailService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async queue(
    input: QueueEmailInput,
  ): Promise<{ id: string; status: EmailDeliveryStatus }> {
    const provider = this.provider();
    const delivery = await this.prisma.emailDelivery.create({
      data: {
        provider,
        status:
          provider === EmailProvider.CONSOLE
            ? EmailDeliveryStatus.SENT
            : EmailDeliveryStatus.QUEUED,
        template: input.template,
        toEmail: input.toEmail,
        subject: input.subject,
        metadata: input.metadata as Prisma.InputJsonValue | undefined,
        userId: input.userId ?? null,
        sentAt: provider === EmailProvider.CONSOLE ? new Date() : null,
        attempts: provider === EmailProvider.CONSOLE ? 1 : 0,
      },
    });

    await this.prisma.auditLog.create({
      data: {
        event:
          provider === EmailProvider.CONSOLE
            ? AuditEvent.EMAIL_DELIVERED
            : AuditEvent.EMAIL_QUEUED,
        userId: input.userId ?? null,
        metadata: { template: input.template, provider },
      },
    });

    if (provider === EmailProvider.CONSOLE) {
      console.log(
        JSON.stringify({
          timestamp: new Date().toISOString(),
          level: "info",
          service: "api",
          message: "development email delivery",
          template: input.template,
          toEmail: input.toEmail,
          subject: input.subject,
          metadata: input.metadata,
        }),
      );
    }

    return { id: delivery.id, status: delivery.status };
  }

  private provider(): EmailProvider {
    const value = env().EMAIL_PROVIDER.toUpperCase();
    return value in EmailProvider
      ? EmailProvider[value as keyof typeof EmailProvider]
      : EmailProvider.CONSOLE;
  }
}
