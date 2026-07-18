import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";
import {
  ModerationStatus,
  SecurityReviewStatus,
} from "../../../../generated/phase5-client";

export class OperationsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collegeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assessmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class ReviewListQueryDto extends OperationsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  studentSearch?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewerId?: string;
}

export class CompleteReviewDto {
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  awardedMarks!: number;

  @IsOptional()
  @IsString()
  feedback?: string;

  @IsOptional()
  @IsString()
  expectedUpdatedAt?: string;
}

export class ModerateResultDto {
  @IsEnum(ModerationStatus)
  action!: ModerationStatus;

  @IsString()
  reason!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  newScore?: number;
}

export class PublishSelectedDto {
  @IsArray()
  @IsString({ each: true })
  resultIds!: string[];
}

export class SecurityReviewDto {
  @IsEnum(SecurityReviewStatus)
  status!: SecurityReviewStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class QueueActionDto {
  @IsString()
  queueName!: string;

  @IsString()
  jobId!: string;
}
