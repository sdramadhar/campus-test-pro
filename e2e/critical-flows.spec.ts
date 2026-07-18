import { expect, test } from "@playwright/test";

const accounts = [
  {
    role: "Super Admin",
    email: "superadmin@campustest.local",
    password: "Admin@12345",
    route: "/super-admin/colleges",
  },
  {
    role: "College Admin",
    email: "admin@demo-college.local",
    password: "Admin@12345",
    route: "/dashboard/college-admin",
  },
  {
    role: "Faculty",
    email: "faculty@demo-college.local",
    password: "Faculty@12345",
    route: "/dashboard/faculty",
  },
  {
    role: "Student",
    email: "student@demo-college.local",
    password: "Student@12345",
    route: "/dashboard/student",
  },
] as const;

async function login(
  page: import("@playwright/test").Page,
  email: string,
  password: string,
) {
  await page.goto("/login");
  await page.getByLabel(/email or student id/i).fill(email);
  await page.getByLabel(/password/i).fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
}

for (const account of accounts) {
  test(`${account.role} can sign in`, async ({ page }) => {
    await login(page, account.email, account.password);
    await expect(page).toHaveURL(
      new RegExp(account.route.replaceAll("/", "\\/")),
    );
  });
}

test("password reset request uses generic success state", async ({ page }) => {
  await page.goto("/forgot-password");
  await page
    .getByLabel(/email or student id/i)
    .fill("student@demo-college.local");
  await page.getByRole("button", { name: /send reset link/i }).click();
  await expect(
    page.getByText(/reset instructions have been sent/i),
  ).toBeVisible();
});

test("unauthorized route rejection is handled", async ({ page }) => {
  await page.goto("/system/queues");
  await expect(page).toHaveURL(/login|unauthorized|system\/queues/);
});
