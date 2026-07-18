"use client";

import {
  BookOpenCheck,
  BookCopy,
  Building2,
  CalendarDays,
  Activity,
  BarChart3,
  ClipboardList,
  GraduationCap,
  Layers,
  LibraryBig,
  ListChecks,
  LogOut,
  NotebookPen,
  Shield,
  UserCheck,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useEffect, useMemo, useState } from "react";
import {
  apiUrl,
  AuthUser,
  roleLabels,
  UserRole,
  restoreSession,
} from "../lib/auth";

type NavIcon =
  | "shield"
  | "building"
  | "user"
  | "student"
  | "department"
  | "course"
  | "semester"
  | "subject"
  | "batch"
  | "users"
  | "questions"
  | "assessments"
  | "tests"
  | "results"
  | "reviews"
  | "operations"
  | "queues";

const adminRoles: UserRole[] = ["SUPER_ADMIN", "COLLEGE_ADMIN"];

const navItems: Array<{
  roles: UserRole[];
  href: string;
  label: string;
  icon: NavIcon;
}> = [
  {
    roles: ["SUPER_ADMIN"],
    href: "/dashboard/super-admin",
    label: "Dashboard",
    icon: "shield",
  },
  {
    roles: ["SUPER_ADMIN"],
    href: "/super-admin/colleges",
    label: "Colleges",
    icon: "building",
  },
  {
    roles: ["COLLEGE_ADMIN"],
    href: "/dashboard/college-admin",
    label: "College Admin",
    icon: "building",
  },
  {
    roles: adminRoles,
    href: "/academic/departments",
    label: "Departments",
    icon: "department",
  },
  {
    roles: adminRoles,
    href: "/academic/courses",
    label: "Courses",
    icon: "course",
  },
  {
    roles: adminRoles,
    href: "/academic/semesters",
    label: "Semesters",
    icon: "semester",
  },
  {
    roles: adminRoles,
    href: "/academic/subjects",
    label: "Subjects",
    icon: "subject",
  },
  {
    roles: adminRoles,
    href: "/academic/batches",
    label: "Batches",
    icon: "batch",
  },
  {
    roles: adminRoles,
    href: "/academic/faculty",
    label: "Faculty",
    icon: "user",
  },
  {
    roles: adminRoles,
    href: "/academic/students",
    label: "Students",
    icon: "users",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/questions",
    label: "Question Bank",
    icon: "questions",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/assessments",
    label: "Assessments",
    icon: "assessments",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/reviews",
    label: "Reviews",
    icon: "reviews",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/exam-operations",
    label: "Operations",
    icon: "operations",
  },
  {
    roles: ["SUPER_ADMIN"],
    href: "/system/queues",
    label: "Queues",
    icon: "queues",
  },
  {
    roles: ["FACULTY"],
    href: "/dashboard/faculty",
    label: "Faculty",
    icon: "user",
  },
  {
    roles: ["STUDENT"],
    href: "/dashboard/student",
    label: "Student",
    icon: "student",
  },
  { roles: ["STUDENT"], href: "/student/tests", label: "Tests", icon: "tests" },
  {
    roles: ["STUDENT"],
    href: "/student/results",
    label: "Results",
    icon: "results",
  },
];

interface AuthShellProps {
  allowedRoles: UserRole[];
  title: string;
  eyebrow: string;
  children?: ReactNode;
  render?: (user: AuthUser) => ReactNode;
}

export function AuthShell({
  allowedRoles,
  title,
  eyebrow,
  children,
  render,
}: AuthShellProps) {
  const router = useRouter();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );

  useEffect(() => {
    let active = true;

    restoreSession()
      .then((restoredUser) => {
        if (!active) {
          return;
        }
        if (!restoredUser) {
          router.replace("/login");
          return;
        }
        if (!allowedRoles.includes(restoredUser.role)) {
          router.replace("/unauthorized");
          return;
        }

        setUser(restoredUser);
        setStatus("ready");
      })
      .catch(() => {
        if (active) {
          setStatus("error");
        }
      });

    return () => {
      active = false;
    };
  }, [allowedRoles, router]);

  const visibleNav = useMemo(
    () =>
      navItems.filter((item) =>
        user ? item.roles.includes(user.role) : false,
      ),
    [user],
  );

  async function logout(): Promise<void> {
    setStatus("loading");
    await fetch(`${apiUrl}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => undefined);
    router.replace("/login");
  }

  if (status === "loading") {
    return <div className="route-state">Restoring secure session...</div>;
  }

  if (status === "error" || !user) {
    return (
      <div className="route-state error">
        We could not restore your session. Please return to login.
      </div>
    );
  }

  return (
    <main className="shell">
      <section className="workspace">
        <aside className="sidebar" aria-label="Primary">
          <div className="brand">
            <BookOpenCheck aria-hidden="true" />
            <span>CampusTest Pro</span>
          </div>
          <nav>
            {visibleNav.map((item) => (
              <Link className="active" href={item.href} key={item.href}>
                {item.icon === "shield" && <Shield aria-hidden="true" />}
                {item.icon === "building" && <Building2 aria-hidden="true" />}
                {item.icon === "user" && <UserCheck aria-hidden="true" />}
                {item.icon === "student" && (
                  <GraduationCap aria-hidden="true" />
                )}
                {item.icon === "department" && (
                  <LibraryBig aria-hidden="true" />
                )}
                {item.icon === "course" && <BookCopy aria-hidden="true" />}
                {item.icon === "semester" && (
                  <CalendarDays aria-hidden="true" />
                )}
                {item.icon === "subject" && (
                  <BookOpenCheck aria-hidden="true" />
                )}
                {item.icon === "batch" && <Layers aria-hidden="true" />}
                {item.icon === "users" && <Users aria-hidden="true" />}
                {item.icon === "questions" && (
                  <NotebookPen aria-hidden="true" />
                )}
                {item.icon === "assessments" && (
                  <ListChecks aria-hidden="true" />
                )}
                {item.icon === "tests" && <ListChecks aria-hidden="true" />}
                {item.icon === "results" && (
                  <GraduationCap aria-hidden="true" />
                )}
                {item.icon === "reviews" && (
                  <ClipboardList aria-hidden="true" />
                )}
                {item.icon === "operations" && <Activity aria-hidden="true" />}
                {item.icon === "queues" && <BarChart3 aria-hidden="true" />}
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            className="sidebar-button"
            onClick={() => void logout()}
            type="button"
          >
            <LogOut aria-hidden="true" />
            Logout
          </button>
        </aside>

        <section className="content">
          <header className="topbar">
            <div>
              <p className="eyebrow">{eyebrow}</p>
              <h1>{title}</h1>
            </div>
            <div className="status ok">{roleLabels[user.role]}</div>
          </header>
          {render ? render(user) : children}
        </section>
      </section>
    </main>
  );
}
