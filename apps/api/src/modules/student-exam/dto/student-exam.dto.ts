import { ApiPropertyOptional } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";
import { AttemptSecurityEventType } from "../../../../generated/phase5-client";

export class StudentAssessmentQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ["asc", "desc"] })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}

export class StartAttemptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sessionKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  clientStartMetadata?: Record<string, unknown>;
}

export class SaveAnswerDto {
  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  selectedOptionKeys?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  textAnswer?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) =>
    value === "" || value === null || value === undefined
      ? undefined
      : Number(value),
  )
  @IsNumber()
  numericalAnswer?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  answerPayload?: Record<string, unknown>;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  markedForReview?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  clearAnswer?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  expectedVersion?: number;
}

export class BatchAnswerItemDto extends SaveAnswerDto {
  @IsString()
  attemptQuestionId!: string;
}

export class BatchSaveAnswersDto {
  @IsArray()
  @Type(() => BatchAnswerItemDto)
  @ValidateNested({ each: true })
  answers!: BatchAnswerItemDto[];
}

export class AttemptEventDto {
  @IsEnum(AttemptSecurityEventType)
  eventType!: AttemptSecurityEventType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}

export class SubmitAttemptDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class UpdateReviewDto {
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  awardedMarks!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  feedback?: string;
}
