"use client";

import {
  BookOpenCheck,
  BookCopy,
  Building2,
  CalendarDays,
  Activity,
  Bell,
  BarChart3,
  ClipboardList,
  FileClock,
  GraduationCap,
  History,
  Layers,
  LibraryBig,
  ListChecks,
  LogOut,
  Moon,
  NotebookPen,
  Settings,
  Shield,
  UserCheck,
  UserCog,
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
  | "queues"
  | "settings"
  | "permissions"
  | "notifications"
  | "audit"
  | "activity"
  | "profile";

const adminRoles: UserRole[] = ["SUPER_ADMIN", "COLLEGE_ADMIN"];

const navItems: Array<{
  roles: UserRole[];
  href: string;
  label: string;
  icon: NavIcon;
}> = [
  {
    roles: adminRoles,
    href: "/admin",
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
    roles: ["SUPER_ADMIN"],
    href: "/super-admin/analytics",
    label: "Platform Analytics",
    icon: "operations",
  },
  {
    roles: ["SUPER_ADMIN"],
    href: "/super-admin/saas",
    label: "SaaS",
    icon: "settings",
  },
  {
    roles: ["SUPER_ADMIN"],
    href: "/super-admin/tenants",
    label: "Tenants",
    icon: "building",
  },
  {
    roles: adminRoles,
    href: "/admin/analytics",
    label: "Analytics",
    icon: "operations",
  },
  {
    roles: adminRoles,
    href: "/admin/reports",
    label: "Reports",
    icon: "audit",
  },
  {
    roles: adminRoles,
    href: "/admin/departments",
    label: "Departments",
    icon: "department",
  },
  {
    roles: adminRoles,
    href: "/admin/courses",
    label: "Courses",
    icon: "course",
  },
  {
    roles: adminRoles,
    href: "/admin/semesters",
    label: "Semesters",
    icon: "semester",
  },
  {
    roles: adminRoles,
    href: "/admin/subjects",
    label: "Subjects",
    icon: "subject",
  },
  {
    roles: adminRoles,
    href: "/admin/batches",
    label: "Batches",
    icon: "batch",
  },
  {
    roles: adminRoles,
    href: "/admin/faculty",
    label: "Faculty",
    icon: "user",
  },
  {
    roles: adminRoles,
    href: "/admin/students",
    label: "Students",
    icon: "users",
  },
  {
    roles: adminRoles,
    href: "/admin/college-settings",
    label: "College Settings",
    icon: "settings",
  },
  {
    roles: adminRoles,
    href: "/onboarding",
    label: "Onboarding",
    icon: "activity",
  },
  {
    roles: adminRoles,
    href: "/settings/subscription",
    label: "Subscription",
    icon: "settings",
  },
  {
    roles: adminRoles,
    href: "/settings/branding",
    label: "Branding",
    icon: "settings",
  },
  {
    roles: adminRoles,
    href: "/settings/domains",
    label: "Domains",
    icon: "settings",
  },
  {
    roles: adminRoles,
    href: "/settings/data-export",
    label: "Data Export",
    icon: "audit",
  },
  {
    roles: adminRoles,
    href: "/admin/permissions",
    label: "Permissions",
    icon: "permissions",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "STUDENT"],
    href: "/admin/profile",
    label: "Profile",
    icon: "profile",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "STUDENT"],
    href: "/admin/notifications",
    label: "Notifications",
    icon: "notifications",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "STUDENT"],
    href: "/support",
    label: "Support",
    icon: "notifications",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "STUDENT"],
    href: "/announcements",
    label: "Announcements",
    icon: "notifications",
  },
  {
    roles: adminRoles,
    href: "/admin/audit-logs",
    label: "Audit Logs",
    icon: "audit",
  },
  {
    roles: adminRoles,
    href: "/admin/activity",
    label: "Activity",
    icon: "activity",
  },
  {
    roles: adminRoles,
    href: "/admin/proctoring/settings",
    label: "Proctoring Settings",
    icon: "shield",
  },
  {
    roles: adminRoles,
    href: "/admin/proctoring/policies",
    label: "Proctoring Policies",
    icon: "permissions",
  },
  {
    roles: adminRoles,
    href: "/admin/proctoring/retention",
    label: "Evidence Retention",
    icon: "audit",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/questions",
    label: "Question Bank",
    icon: "questions",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/questions/ai-generate",
    label: "AI Generate",
    icon: "questions",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/questions/ai-jobs",
    label: "AI Jobs",
    icon: "activity",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/questions/ai-batch",
    label: "AI Batch",
    icon: "activity",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/questions/import-document",
    label: "Document Import",
    icon: "audit",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/academic/syllabi",
    label: "Syllabi",
    icon: "course",
  },
  {
    roles: adminRoles,
    href: "/admin/ai/prompts",
    label: "AI Prompts",
    icon: "settings",
  },
  {
    roles: adminRoles,
    href: "/admin/ai/usage",
    label: "AI Usage",
    icon: "operations",
  },
  {
    roles: adminRoles,
    href: "/admin/ai/settings",
    label: "AI Settings",
    icon: "permissions",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/assessments",
    label: "Assessments",
    icon: "assessments",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/assessments/ai-paper",
    label: "AI Paper",
    icon: "assessments",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/assessments/random-sets",
    label: "Random Sets",
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
    href: "/coding/reviews",
    label: "Coding Reviews",
    icon: "questions",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/coding/plagiarism",
    label: "Plagiarism Review",
    icon: "audit",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/analytics/coding",
    label: "Coding Analytics",
    icon: "operations",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/proctor/live",
    label: "Live Proctoring",
    icon: "shield",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/proctor/reviews",
    label: "Proctor Reviews",
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
    href: "/system/infrastructure",
    label: "Infrastructure",
    icon: "settings",
  },
  {
    roles: ["SUPER_ADMIN"],
    href: "/system/queues",
    label: "Queues",
    icon: "queues",
  },
  {
    roles: ["SUPER_ADMIN"],
    href: "/system/code-runner",
    label: "Code Runner",
    icon: "queues",
  },
  {
    roles: adminRoles,
    href: "/admin/code-runner/languages",
    label: "Runner Languages",
    icon: "settings",
  },
  {
    roles: adminRoles,
    href: "/admin/code-runner/images",
    label: "Runner Images",
    icon: "settings",
  },
  {
    roles: ["FACULTY"],
    href: "/dashboard/faculty",
    label: "Faculty",
    icon: "user",
  },
  {
    roles: ["FACULTY"],
    href: "/faculty/analytics",
    label: "Faculty Analytics",
    icon: "operations",
  },
  {
    roles: ["STUDENT"],
    href: "/dashboard/student",
    label: "Student",
    icon: "student",
  },
  {
    roles: ["STUDENT"],
    href: "/student/analytics",
    label: "My Analytics",
    icon: "operations",
  },
  {
    roles: ["STUDENT"],
    href: "/student/report",
    label: "My Report",
    icon: "results",
  },
  { roles: ["STUDENT"], href: "/student/tests", label: "Tests", icon: "tests" },
  {
    roles: ["STUDENT"],
    href: "/student/proctoring",
    label: "Proctoring",
    icon: "shield",
  },
  {
    roles: ["STUDENT"],
    href: "/student/results",
    label: "Results",
    icon: "results",
  },
  {
    roles: ["STUDENT"],
    href: "/student/coding-submissions",
    label: "Coding History",
    icon: "questions",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY", "STUDENT"],
    href: "/leaderboards",
    label: "Leaderboards",
    icon: "results",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/reports/builder",
    label: "Report Builder",
    icon: "audit",
  },
  {
    roles: ["SUPER_ADMIN", "COLLEGE_ADMIN", "FACULTY"],
    href: "/analytics/insights",
    label: "AI Insights",
    icon: "activity",
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

  useEffect(() => {
    const savedTheme = localStorage.getItem("campustest-theme");
    if (savedTheme === "dark" || savedTheme === "light") {
      document.documentElement.dataset.theme = savedTheme;
    }
  }, []);

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

  function toggleTheme(): void {
    const current = document.documentElement.dataset.theme;
    const next = current === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("campustest-theme", next);
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
                {item.icon === "settings" && <Settings aria-hidden="true" />}
                {item.icon === "permissions" && <UserCog aria-hidden="true" />}
                {item.icon === "notifications" && <Bell aria-hidden="true" />}
                {item.icon === "audit" && <FileClock aria-hidden="true" />}
                {item.icon === "activity" && <History aria-hidden="true" />}
                {item.icon === "profile" && <UserCheck aria-hidden="true" />}
                {item.label}
              </Link>
            ))}
          </nav>
          <button
            className="sidebar-button"
            onClick={toggleTheme}
            type="button"
          >
            <Moon aria-hidden="true" />
            Dark Mode
          </button>
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
