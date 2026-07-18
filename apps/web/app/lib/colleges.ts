import { z } from "zod";
import { apiUrl } from "./auth";

export type CollegeStatus = "ACTIVE" | "INACTIVE";

export interface CollegeListItem {
  id: string;
  name: string;
  collegeCode: string;
  email: string;
  location: string;
  city: string;
  state: string;
  country: string;
  status: CollegeStatus;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
}

export interface CollegeDetail extends CollegeListItem {
  phone: string | null;
  website: string | null;
  addressLine1: string;
  addressLine2: string | null;
  postalCode: string;
  logoUrl: string | null;
  collegeAdmins: Array<{
    id: string;
    email: string;
    name: string;
    phone: string | null;
  }>;
  userCount: number;
  statistics: {
    totalStudents: number;
    totalFaculty: number;
    totalTests: number;
    activeTests: number;
  };
  recentActivity: Array<{ id: string; event: string; createdAt: string }>;
}

export interface CollegeListResponse {
  success: true;
  data: CollegeListItem[];
  meta: { page: number; pageSize: number; total: number; totalPages: number };
}

export const collegeSchema = z
  .object({
    name: z.string().trim().min(2, "College name is required.").max(160),
    collegeCode: z
      .string()
      .trim()
      .min(2, "College code is required.")
      .max(32)
      .regex(
        /^[A-Za-z0-9_-]+$/,
        "Use letters, numbers, hyphen, or underscore.",
      ),
    email: z.email("Enter a valid primary email.").trim().max(160),
    phone: z.string().trim().max(40).optional(),
    website: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) =>
          !value || value.startsWith("http://") || value.startsWith("https://"),
        {
          message: "Website must start with http:// or https://.",
        },
      ),
    addressLine1: z
      .string()
      .trim()
      .min(2, "Address line 1 is required.")
      .max(180),
    addressLine2: z.string().trim().max(180).optional(),
    city: z.string().trim().min(2, "City is required.").max(100),
    state: z.string().trim().min(2, "State is required.").max(100),
    postalCode: z.string().trim().min(2, "Postal code is required.").max(20),
    country: z.string().trim().min(2, "Country is required.").max(100),
    logoUrl: z
      .string()
      .trim()
      .optional()
      .refine(
        (value) =>
          !value || value.startsWith("http://") || value.startsWith("https://"),
        {
          message: "Logo URL must start with http:// or https://.",
        },
      ),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    createAdmin: z.boolean(),
    adminFullName: z.string().trim().optional(),
    adminEmail: z.string().trim().optional(),
    adminPhone: z.string().trim().optional(),
    temporaryPassword: z.string().trim().optional(),
  })
  .superRefine((value, context) => {
    if (!value.createAdmin) {
      return;
    }
    if (!value.adminFullName || value.adminFullName.length < 2) {
      context.addIssue({
        code: "custom",
        path: ["adminFullName"],
        message: "Admin name is required.",
      });
    }
    if (!value.adminEmail || !z.email().safeParse(value.adminEmail).success) {
      context.addIssue({
        code: "custom",
        path: ["adminEmail"],
        message: "Valid admin email is required.",
      });
    }
    if (!value.temporaryPassword || value.temporaryPassword.length < 8) {
      context.addIssue({
        code: "custom",
        path: ["temporaryPassword"],
        message: "Temporary password must be at least 8 characters.",
      });
    }
  });

export type CollegeFormValues = z.infer<typeof collegeSchema>;

export async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  const response = await fetch(`${apiUrl}${path}`, {
    ...init,
    credentials: "include",
    headers,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with ${String(response.status)}`);
  }

  return (await response.json()) as T;
}

export function toCollegePayload(values: CollegeFormValues) {
  return {
    name: values.name,
    collegeCode: values.collegeCode,
    email: values.email,
    phone: values.phone || undefined,
    website: values.website || undefined,
    addressLine1: values.addressLine1,
    addressLine2: values.addressLine2 || undefined,
    city: values.city,
    state: values.state,
    postalCode: values.postalCode,
    country: values.country,
    logoUrl: values.logoUrl || undefined,
    status: values.status,
    firstAdmin: values.createAdmin
      ? {
          fullName: values.adminFullName,
          email: values.adminEmail,
          phone: values.adminPhone || undefined,
          temporaryPassword: values.temporaryPassword,
        }
      : undefined,
  };
}

export function generateTemporaryPassword(): string {
  const random = Math.random().toString(36).slice(2, 10);
  return `Temp@${random}9`;
}
