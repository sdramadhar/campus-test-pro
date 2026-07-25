import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsArray,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import {
  InsightStatus,
  ReportOutputFormat,
  ReportScheduleFrequency,
} from "../../../../generated/phase5-client";

export class AnalyticsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collegeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  semesterId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  batchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  assessmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  from?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  to?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize?: number;
}

export class CompareAnalyticsDto extends AnalyticsQueryDto {
  @ApiProperty()
  @IsString()
  dimension!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  groupIds?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  metric?: string;
}

export class CreateReportDefinitionDto {
  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty()
  @IsString()
  reportType!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columns?: string[];

  @ApiPropertyOptional({ enum: ReportOutputFormat })
  @IsOptional()
  @IsEnum(ReportOutputFormat)
  outputFormat?: ReportOutputFormat;
}

export class UpdateReportDefinitionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reportType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  columns?: string[];

  @ApiPropertyOptional({ enum: ReportOutputFormat })
  @IsOptional()
  @IsEnum(ReportOutputFormat)
  outputFormat?: ReportOutputFormat;
}

export class RunReportDto extends AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: ReportOutputFormat })
  @IsOptional()
  @IsEnum(ReportOutputFormat)
  outputFormat?: ReportOutputFormat;
}

export class ScheduleReportDto {
  @ApiProperty({ enum: ReportScheduleFrequency })
  @IsEnum(ReportScheduleFrequency)
  frequency!: ReportScheduleFrequency;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cronExpression?: string;
}

export class ReviewInsightDto {
  @ApiProperty({ enum: InsightStatus })
  @IsEnum(InsightStatus)
  status!: InsightStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reviewNote?: string;
}
