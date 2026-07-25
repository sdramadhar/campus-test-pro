import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import {
  FullscreenExitPolicy,
  MultipleSessionPolicy,
  ProctoringEventType,
  ProctoringEvidenceType,
  ProctoringReviewStatus,
  ScreenCaptureMode,
  WebcamSnapshotMode,
} from "../../../../generated/phase5-client";

export class ProctoringPolicyDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assessmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  proctoringEnabled?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  consentRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fullscreenRequired?: boolean;

  @ApiPropertyOptional({ enum: FullscreenExitPolicy })
  @IsOptional()
  @IsEnum(FullscreenExitPolicy)
  fullscreenExitPolicy?: FullscreenExitPolicy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  tabSwitchMonitoring?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  copyMonitoring?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  pasteMonitoring?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  contextMenuMonitoring?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  keyboardShortcutMonitoring?: boolean;

  @ApiPropertyOptional({ enum: MultipleSessionPolicy })
  @IsOptional()
  @IsEnum(MultipleSessionPolicy)
  multipleSessionPolicy?: MultipleSessionPolicy;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  webcamRequired?: boolean;

  @ApiPropertyOptional({ enum: WebcamSnapshotMode })
  @IsOptional()
  @IsEnum(WebcamSnapshotMode)
  webcamSnapshotMode?: WebcamSnapshotMode;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(30)
  @Max(3600)
  webcamSnapshotIntervalSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  microphoneRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  microphoneCheckOnly?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  screenShareRequired?: boolean;

  @ApiPropertyOptional({ enum: ScreenCaptureMode })
  @IsOptional()
  @IsEnum(ScreenCaptureMode)
  screenCaptureMode?: ScreenCaptureMode;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(30)
  @Max(3600)
  screenCaptureIntervalSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  identityCheckRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  environmentCheckRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(10)
  @Max(3600)
  networkDisconnectThresholdSeconds?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  warningThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  flagThreshold?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  autoSubmitOnCriticalViolation?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  allowManualOverride?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(3650)
  evidenceRetentionDays?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  studentReviewVisibility?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  proctorInstructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  institutionPrivacyNotice?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencySupportContact?: string;
}

export class ConsentDto {
  @ApiProperty()
  @IsBoolean()
  accepted!: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  consentVersion?: string;
}

export class SystemCheckDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  browser?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  cameraPermission?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  microphonePermission?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  screenShareSupported?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  fullscreenSupported?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceHash?: string;
}

export class StartProctoringDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceHash?: string;
}

export class ProctoringEventDto {
  @ApiProperty({ enum: ProctoringEventType })
  @IsEnum(ProctoringEventType)
  eventType!: ProctoringEventType;

  @ApiProperty()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  sequenceNumber!: number;

  @ApiProperty()
  @IsString()
  idempotencyKey!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientTimestamp?: string;
}

export class EventBatchDto {
  @ApiProperty({ type: [ProctoringEventDto] })
  @IsArray()
  events!: ProctoringEventDto[];
}

export class HeartbeatDto {
  @ApiProperty()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  sequenceNumber!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientTimestamp?: string;

  @ApiProperty()
  @IsString()
  connectivityState!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cameraState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  microphoneState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  screenShareState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fullscreenState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentQuestionId?: string;
}

export class EvidenceDto {
  @ApiProperty({ enum: ProctoringEvidenceType })
  @IsEnum(ProctoringEvidenceType)
  evidenceType!: ProctoringEvidenceType;

  @ApiProperty()
  @IsString()
  fileName!: string;

  @ApiProperty()
  @IsString()
  mimeType!: string;

  @ApiProperty()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(5_000_000)
  sizeBytes!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  checksum?: string;
}

export class ProctorActionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  message?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class ReviewDecisionDto {
  @ApiProperty({ enum: ProctoringReviewStatus })
  @IsEnum(ProctoringReviewStatus)
  decision!: ProctoringReviewStatus;

  @ApiProperty()
  @IsString()
  reason!: string;
}
