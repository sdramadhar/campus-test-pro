import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from "class-validator";
import { Transform } from "class-transformer";
import { CollegeStatus } from "../../../../generated/phase5-client";

export class FirstCollegeAdminDto {
  @ApiProperty({ example: "Jordan College Admin" })
  @IsString()
  @MaxLength(120)
  fullName!: string;

  @ApiProperty({ example: "admin@new-college.local" })
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @ApiPropertyOptional({ example: "+1 555 0100" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiProperty({ example: "Temp@12345" })
  @IsString()
  @MaxLength(256)
  temporaryPassword!: string;
}

export class CreateCollegeDto {
  @ApiProperty({ example: "North Valley College" })
  @IsString()
  @MaxLength(160)
  name!: string;

  @ApiProperty({ example: "NVC" })
  @IsString()
  @MaxLength(32)
  collegeCode!: string;

  @ApiProperty({ example: "contact@northvalley.local" })
  @IsEmail()
  @MaxLength(160)
  email!: string;

  @ApiPropertyOptional({ example: "+1 555 0199" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional({ example: "https://northvalley.local" })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(240)
  website?: string;

  @ApiProperty({ example: "100 Campus Drive" })
  @IsString()
  @MaxLength(180)
  addressLine1!: string;

  @ApiPropertyOptional({ example: "Academic Block A" })
  @IsOptional()
  @IsString()
  @MaxLength(180)
  addressLine2?: string;

  @ApiProperty({ example: "Springfield" })
  @IsString()
  @MaxLength(100)
  city!: string;

  @ApiProperty({ example: "Illinois" })
  @IsString()
  @MaxLength(100)
  state!: string;

  @ApiProperty({ example: "62701" })
  @IsString()
  @MaxLength(20)
  postalCode!: string;

  @ApiProperty({ example: "United States" })
  @IsString()
  @MaxLength(100)
  country!: string;

  @ApiPropertyOptional({ example: "https://cdn.example.com/logo.png" })
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  logoUrl?: string;

  @ApiPropertyOptional({ enum: CollegeStatus })
  @IsOptional()
  @IsEnum(CollegeStatus)
  status?: CollegeStatus;

  @ApiPropertyOptional({ type: FirstCollegeAdminDto })
  @IsOptional()
  firstAdmin?: FirstCollegeAdminDto;
}

export class UpdateCollegeDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(160)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  @MaxLength(160)
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(240)
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  addressLine1?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(180)
  addressLine2?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  state?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(20)
  postalCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  country?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  @MaxLength(500)
  logoUrl?: string;
}

export class UpdateCollegeStatusDto {
  @ApiProperty({ enum: CollegeStatus })
  @IsEnum(CollegeStatus)
  status!: CollegeStatus;
}

export class ListCollegesQueryDto {
  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  page?: number | string;

  @ApiPropertyOptional({ default: 10 })
  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number | string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  search?: string;

  @ApiPropertyOptional({ enum: CollegeStatus })
  @IsOptional()
  @IsEnum(CollegeStatus)
  status?: CollegeStatus;

  @ApiPropertyOptional({ enum: ["name", "createdAt", "status"] })
  @IsOptional()
  @IsEnum(["name", "createdAt", "status"])
  sortBy?: "name" | "createdAt" | "status";

  @ApiPropertyOptional({ enum: ["asc", "desc"] })
  @IsOptional()
  @IsEnum(["asc", "desc"])
  sortOrder?: "asc" | "desc";
}
