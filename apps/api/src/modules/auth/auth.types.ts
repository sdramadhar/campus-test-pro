import { Role } from "../../../generated/phase5-client";

export interface AuthenticatedUser {
  id: string;
  email: string;
  studentId: string | null;
  name: string;
  role: Role;
  collegeId: string | null;
  collegeName: string | null;
}

export interface AccessTokenPayload {
  sub: string;
  role: Role;
  collegeId: string | null;
}

export interface CookieRequest {
  cookies?: Record<string, string | undefined>;
  headers: {
    authorization?: string | string[];
    "user-agent"?: string | string[];
  };
  ip?: string;
  user?: AuthenticatedUser;
}
