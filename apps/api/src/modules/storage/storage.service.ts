import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { Role } from '../../../generated/phase5-client';
import { AuthenticatedUser } from '../auth/auth.types';
import { env } from '../config/environment';
import { PrismaService } from '../prisma/prisma.service';

const allowedMimeTypes = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'application/pdf',
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
]);

@Injectable()
export class StorageService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async createSignedUpload(user: AuthenticatedUser, input: { fileName: string; mimeType: string; sizeBytes: number; purpose: string }) {
    if (user.role === Role.STUDENT) {
      throw new ForbiddenException('Storage uploads require staff access.');
    }
    if (!allowedMimeTypes.has(input.mimeType)) {
      throw new BadRequestException('File type is not allowed.');
    }
    if (input.sizeBytes <= 0 || input.sizeBytes > 10 * 1024 * 1024) {
      throw new BadRequestException('File size is outside the allowed range.');
    }
    const current = env();
    if (!this.storageAvailable(current)) {
      throw new ServiceUnavailableException(
        'Object storage is not configured for this deployment.',
      );
    }
    const tenantPrefix = user.collegeId ?? 'global';
    const objectKey = `${tenantPrefix}/${input.purpose}/${randomBytes(16).toString('hex')}`;
    const object = await this.prisma.storageObject.create({
      data: {
        collegeId: user.collegeId,
        ownerId: user.id,
        bucket: current.STORAGE_BUCKET ?? 'campustest-local',
        objectKey,
        fileName: input.fileName,
        mimeType: input.mimeType,
        sizeBytes: input.sizeBytes,
        purpose: input.purpose,
        metadata: { provider: current.STORAGE_PROVIDER, malwareScan: 'pending-hook' }
      }
    });

    return {
      success: true,
      data: {
        objectId: object.id,
        objectKey: object.objectKey,
        uploadUrl:
          current.STORAGE_PROVIDER === 'local'
            ? `/api/v1/storage/local/${encodeURIComponent(object.id)}`
            : `s3://${object.bucket}/${object.objectKey}`,
        expiresInSeconds: 900,
        headers: { 'Content-Type': input.mimeType }
      }
    };
  }

  private storageAvailable(current: ReturnType<typeof env>): boolean {
    if (current.STORAGE_PROVIDER === 'disabled') {
      return false;
    }
    if (current.STORAGE_PROVIDER === 'local') {
      return true;
    }
    return Boolean(
      (current.STORAGE_BUCKET || current.OBJECT_STORAGE_BUCKET) &&
        (current.S3_REGION || current.OBJECT_STORAGE_REGION) &&
        (current.S3_ACCESS_KEY_ID || current.OBJECT_STORAGE_ACCESS_KEY) &&
        (current.S3_SECRET_ACCESS_KEY || current.OBJECT_STORAGE_SECRET_KEY),
    );
  }
}
