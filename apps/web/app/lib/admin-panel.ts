import { z } from "zod";
import { academicRequest, EntityRecord, ListResponse } from "./academic";

export const themePreferenceSchema = z.enum(["SYSTEM", "LIGHT", "DARK"]);

export const collegeSettingsSchema = z.object({
  timezone: z.string().trim().min(1).max(80),
  academicYearStartMonth: z.coerce.number().int().min(1).max(12),
  brandingColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  notificationsEnabled: z.boolean(),
  examGraceMinutes: z.coerce.number().int().min(0).max(60),
});

export const profileSchema = z.object({
  name: z.string().trim().min(1).max(160),
  phone: z.string().trim().max(40).optional(),
  themePreference: themePreferenceSchema,
});

export interface DashboardResponse {
  success: true;
  data: {
    totals: Record<string, number>;
    charts: Record<string, Array<{ label: string; value: number }>>;
    recentActivity: EntityRecord[];
  };
}

export interface SingleAdminResponse {
  success: true;
  data: EntityRecord | null;
}

export function adminRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  return academicRequest<T>(path, init);
}

export type AdminListResponse = ListResponse;

export function toText(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  return fallback;
}
