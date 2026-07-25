import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import { CodingReviewStatus } from "../../../../generated/phase5-client";

export class CodingRunDto {
  @ApiProperty()
  @IsString()
  languageId!: string;

  @ApiProperty()
  @IsString()
  sourceCode!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  stdin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}

export class CodingSubmitDto extends CodingRunDto {}

export class CodingActionDto {
  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class CodingScoreDto {
  @ApiProperty()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(0)
  score!: number;

  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  reason!: string;
}

export class PlagiarismJobDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assessmentId?: string;
}

export class PlagiarismDecisionDto {
  @ApiProperty({ enum: CodingReviewStatus })
  @IsEnum(CodingReviewStatus)
  status!: CodingReviewStatus;

  @ApiProperty()
  @IsString()
  @MaxLength(1000)
  reason!: string;
}
