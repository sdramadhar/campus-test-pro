import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
  MinLength,
} from "class-validator";

export class InstitutionSignupDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  institutionName!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(40)
  institutionCode!: string;

  @ApiProperty()
  @IsEmail()
  adminEmail!: string;

  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  adminName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  website?: string;
}

export class SaveOnboardingStepDto {
  @ApiProperty()
  @IsString()
  @MaxLength(80)
  step!: string;

  @ApiPropertyOptional()
  @IsOptional()
  payload?: unknown;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  completed?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  skipped?: boolean;
}

export class CheckoutSessionDto {
  @ApiProperty()
  @IsString()
  planVersionId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  idempotencyKey?: string;
}

export class ChangeSubscriptionDto {
  @ApiProperty()
  @IsString()
  planId!: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(500)
  reason!: string;
}

export class ReasonDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(500)
  reason!: string;
}

export class BrandingDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  institutionName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  shortName?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(16)
  primaryColor!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(16)
  secondaryColor!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  supportEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  supportPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  privacyPolicyUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  termsUrl?: string;
}

export class DomainDto {
  @ApiProperty()
  @IsString()
  @MinLength(4)
  @MaxLength(253)
  domain!: string;
}

export class SupportTicketDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  @MaxLength(160)
  subject!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(80)
  category!: string;

  @ApiProperty({ enum: ["LOW", "NORMAL", "HIGH", "URGENT"] })
  @IsIn(["LOW", "NORMAL", "HIGH", "URGENT"])
  priority!: "LOW" | "NORMAL" | "HIGH" | "URGENT";

  @ApiProperty()
  @IsString()
  @MinLength(10)
  @MaxLength(4000)
  message!: string;
}

export class SupportReplyDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(4000)
  message!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  internal?: boolean;
}

export class MobileDeviceDto {
  @ApiProperty()
  @IsString()
  @MaxLength(120)
  deviceName!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(40)
  platform!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  appVersion?: string;
}

export class PushTokenDto {
  @ApiProperty()
  @IsString()
  @MinLength(12)
  token!: string;

  @ApiProperty()
  @IsString()
  @MaxLength(40)
  provider!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  deviceId?: string;
}

export class DataExportDto {
  @ApiProperty({ isArray: true })
  @IsArray()
  @IsString({ each: true })
  categories!: string[];

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(500)
  reason!: string;
}

export class TenantStatusDto extends ReasonDto {
  @ApiProperty({
    enum: ["LEAD", "TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELLED", "ARCHIVED"],
  })
  @IsIn(["LEAD", "TRIAL", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELLED", "ARCHIVED"])
  status!:
    | "LEAD"
    | "TRIAL"
    | "ACTIVE"
    | "PAST_DUE"
    | "SUSPENDED"
    | "CANCELLED"
    | "ARCHIVED";
}

export class TrialExtensionDto extends ReasonDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  @Max(90)
  days!: number;
}

export class TenantCreditDto extends ReasonDto {
  @ApiProperty()
  @IsInt()
  @Min(1)
  amountCents!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(3)
  currency?: string;
}
