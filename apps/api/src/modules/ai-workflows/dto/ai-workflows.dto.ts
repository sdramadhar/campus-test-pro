import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from "class-validator";
import {
  AiPromptFeatureType,
  BloomLevel,
  DuplicateReviewStatus,
  EntityStatus,
  QuestionDifficulty,
  QuestionType,
} from "../../../../generated/phase5-client";

export class GenerateQuestionsDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collegeId?: string;

  @ApiProperty()
  @IsString()
  subjectId!: string;

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
  unit?: string;

  @ApiProperty()
  @IsString()
  topic!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  syllabusText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sourceNotes?: string;

  @ApiProperty({ enum: QuestionType })
  @IsEnum(QuestionType)
  questionType!: QuestionType;

  @ApiProperty()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(25)
  requestedCount!: number;

  @ApiPropertyOptional({ enum: QuestionDifficulty })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional({ enum: BloomLevel })
  @IsOptional()
  @IsEnum(BloomLevel)
  bloomLevel?: BloomLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  marks?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  negativeMarks?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  language?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  explanationRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  answerKeyRequired?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  outputStyle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  avoidDuplicate?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  promptTemplateId?: string;
}

export class AiJobListQueryDto {
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
}

export class ReviewGeneratedQuestionDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  resultIds!: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  reason?: string;
}

export class UpdateGeneratedQuestionDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  questionText?: string;

  @ApiPropertyOptional()
  @IsOptional()
  options?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  correctAnswer?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  explanation?: string;

  @ApiPropertyOptional({ enum: QuestionDifficulty })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  approvedDifficulty?: QuestionDifficulty;

  @ApiPropertyOptional({ enum: BloomLevel })
  @IsOptional()
  @IsEnum(BloomLevel)
  approvedBloomLevel?: BloomLevel;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  marks?: number;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  tags?: string[];
}

export class PromptTemplateDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collegeId?: string;

  @ApiProperty()
  @IsString()
  name!: string;

  @ApiProperty({ enum: AiPromptFeatureType })
  @IsEnum(AiPromptFeatureType)
  featureType!: AiPromptFeatureType;

  @ApiProperty()
  @IsString()
  systemInstruction!: string;

  @ApiProperty()
  @IsString()
  userPromptTemplate!: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  variables!: string[];

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  providerCompatibility?: string[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class ImportDocumentDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collegeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectId?: string;

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
  sizeBytes!: number;

  @ApiProperty()
  @IsString()
  content!: string;
}

export class DuplicateCheckDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collegeId?: string;

  @ApiProperty()
  @IsString()
  questionText!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectId?: string;
}

export class DuplicateReviewDto {
  @ApiProperty({ enum: DuplicateReviewStatus })
  @IsEnum(DuplicateReviewStatus)
  reviewedStatus!: DuplicateReviewStatus;
}

export class SyllabusTopicDto {
  @ApiProperty()
  @IsString()
  topicName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  outcomes?: string[];
}

export class SyllabusUnitDto {
  @ApiProperty()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  unitNumber!: number;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  outcomes?: string[];

  @ApiPropertyOptional({ type: [SyllabusTopicDto] })
  @IsOptional()
  @IsArray()
  topics?: SyllabusTopicDto[];
}

export class SyllabusDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  collegeId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  courseId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  semesterId?: string;

  @ApiProperty()
  @IsString()
  subjectId!: string;

  @ApiProperty()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(2000)
  academicYear!: number;

  @ApiProperty()
  @IsString()
  title!: string;

  @ApiPropertyOptional({ type: [String] })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  learningOutcomes?: string[];

  @ApiPropertyOptional({ enum: EntityStatus })
  @IsOptional()
  @IsEnum(EntityStatus)
  status?: EntityStatus;

  @ApiPropertyOptional({ type: [SyllabusUnitDto] })
  @IsOptional()
  @IsArray()
  units?: SyllabusUnitDto[];
}

export class BlueprintDto {
  @ApiProperty()
  @IsString()
  assessmentId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  subjectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  unit?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  topic?: string;

  @ApiPropertyOptional({ enum: QuestionType })
  @IsOptional()
  @IsEnum(QuestionType)
  questionType?: QuestionType;

  @ApiPropertyOptional({ enum: QuestionDifficulty })
  @IsOptional()
  @IsEnum(QuestionDifficulty)
  difficulty?: QuestionDifficulty;

  @ApiPropertyOptional({ enum: BloomLevel })
  @IsOptional()
  @IsEnum(BloomLevel)
  bloomLevel?: BloomLevel;

  @ApiProperty()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  questionCount!: number;

  @ApiProperty()
  @Transform(({ value }) => Number(value))
  @IsNumber()
  @Min(0)
  marks!: number;
}
