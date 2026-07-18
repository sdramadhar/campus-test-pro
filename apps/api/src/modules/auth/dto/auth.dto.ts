import { ApiProperty } from "@nestjs/swagger";
import { IsEmail, IsOptional, IsString, MinLength } from "class-validator";
import { z } from "zod";

export const loginSchema = z.object({
  identifier: z.string().trim().min(1).max(160),
  password: z.string().min(8).max(256),
});

export const forgotPasswordSchema = z.object({
  identifier: z.string().trim().min(1).max(160),
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(32).max(512),
  password: z
    .string()
    .min(10)
    .max(256)
    .regex(/[A-Z]/, "Password must contain an uppercase letter.")
    .regex(/[a-z]/, "Password must contain a lowercase letter.")
    .regex(/[0-9]/, "Password must contain a number.")
    .regex(/[^A-Za-z0-9]/, "Password must contain a symbol."),
});

export class LoginDto {
  @ApiProperty({
    description: "Email address or student ID.",
    example: "student@demo-college.local",
  })
  @IsString()
  identifier!: string;

  @ApiProperty({ example: "Student@12345" })
  @IsString()
  @MinLength(8)
  password!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: "student@demo-college.local" })
  @IsString()
  identifier!: string;
}

export class ResetPasswordDto {
  @ApiProperty()
  @IsString()
  token!: string;

  @ApiProperty({ example: "NewPassword@12345" })
  @IsString()
  @MinLength(10)
  password!: string;
}

export class UserProfileDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  @IsEmail()
  email!: string;

  @ApiProperty({ nullable: true })
  @IsOptional()
  studentId!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty()
  role!: string;

  @ApiProperty({ nullable: true })
  collegeId!: string | null;

  @ApiProperty({ nullable: true })
  collegeName!: string | null;
}
