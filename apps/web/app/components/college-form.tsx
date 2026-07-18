"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { KeyRound, Loader2, Save, Wand2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  apiRequest,
  CollegeDetail,
  CollegeFormValues,
  collegeSchema,
  generateTemporaryPassword,
  toCollegePayload,
} from "../lib/colleges";

interface CollegeFormProps {
  college?: CollegeDetail;
  mode: "create" | "edit";
}

interface CollegeMutationResponse {
  success: true;
  data: { id: string };
}

export function CollegeForm({ college, mode }: CollegeFormProps) {
  const router = useRouter();
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);
  const [isDirtyWarningEnabled, setIsDirtyWarningEnabled] = useState(false);
  const {
    formState: { errors, isDirty, isSubmitting },
    handleSubmit,
    register,
    setValue,
    watch,
  } = useForm<CollegeFormValues>({
    resolver: zodResolver(collegeSchema),
    defaultValues: {
      name: college?.name ?? "",
      collegeCode: college?.collegeCode ?? "",
      email: college?.email ?? "",
      phone: college?.phone ?? "",
      website: college?.website ?? "",
      addressLine1: college?.addressLine1 ?? "",
      addressLine2: college?.addressLine2 ?? "",
      city: college?.city ?? "",
      state: college?.state ?? "",
      postalCode: college?.postalCode ?? "",
      country: college?.country ?? "United States",
      logoUrl: college?.logoUrl ?? "",
      status: college?.status ?? "ACTIVE",
      createAdmin: false,
      adminFullName: "",
      adminEmail: "",
      adminPhone: "",
      temporaryPassword: "",
    },
  });
  const createAdmin = watch("createAdmin");

  useEffect(() => {
    setIsDirtyWarningEnabled(true);
  }, []);

  useEffect(() => {
    if (!isDirtyWarningEnabled) {
      return;
    }
    const handler = (event: BeforeUnloadEvent) => {
      if (isDirty && !isSubmitting) {
        event.preventDefault();
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => {
      window.removeEventListener("beforeunload", handler);
    };
  }, [isDirty, isDirtyWarningEnabled, isSubmitting]);

  async function submit(values: CollegeFormValues): Promise<void> {
    setToast(null);
    const payload = toCollegePayload(values);
    try {
      const result =
        mode === "create"
          ? await apiRequest<CollegeMutationResponse>("/api/v1/colleges", {
              method: "POST",
              body: JSON.stringify(payload),
            })
          : await apiRequest<CollegeMutationResponse>(
              `/api/v1/colleges/${college?.id ?? ""}`,
              {
                method: "PATCH",
                body: JSON.stringify(payload),
              },
            );
      setToast({
        type: "success",
        message: mode === "create" ? "College created." : "College saved.",
      });
      router.push(`/super-admin/colleges/${result.data.id}`);
    } catch (error) {
      setToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Unable to save college.",
      });
    }
  }

  function fieldError(name: keyof CollegeFormValues): string | null {
    const message = errors[name]?.message;
    return typeof message === "string" ? message : null;
  }

  return (
    <form
      className="entity-form"
      onSubmit={(event) => void handleSubmit(submit)(event)}
    >
      {toast && <div className={`${toast.type}-alert`}>{toast.message}</div>}
      <section className="form-grid">
        <Field label="College name" error={fieldError("name")}>
          <input {...register("name")} />
        </Field>
        <Field label="College code" error={fieldError("collegeCode")}>
          <input {...register("collegeCode")} disabled={mode === "edit"} />
        </Field>
        <Field label="Primary email" error={fieldError("email")}>
          <input {...register("email")} />
        </Field>
        <Field label="Phone" error={fieldError("phone")}>
          <input {...register("phone")} />
        </Field>
        <Field label="Website" error={fieldError("website")}>
          <input {...register("website")} />
        </Field>
        <Field label="Logo URL" error={fieldError("logoUrl")}>
          <input {...register("logoUrl")} />
        </Field>
        <Field label="Address line 1" error={fieldError("addressLine1")}>
          <input {...register("addressLine1")} />
        </Field>
        <Field label="Address line 2" error={fieldError("addressLine2")}>
          <input {...register("addressLine2")} />
        </Field>
        <Field label="City" error={fieldError("city")}>
          <input {...register("city")} />
        </Field>
        <Field label="State" error={fieldError("state")}>
          <input {...register("state")} />
        </Field>
        <Field label="Postal code" error={fieldError("postalCode")}>
          <input {...register("postalCode")} />
        </Field>
        <Field label="Country" error={fieldError("country")}>
          <input {...register("country")} />
        </Field>
        <Field label="Status" error={fieldError("status")}>
          <select {...register("status")}>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>
        </Field>
      </section>

      {mode === "create" && (
        <section className="panel form-section">
          <div className="panel-header">
            <h2>First College Admin</h2>
            <label className="toggle-row">
              <input type="checkbox" {...register("createAdmin")} />
              Create admin
            </label>
          </div>
          {createAdmin && (
            <div className="form-grid">
              <Field
                label="Admin full name"
                error={fieldError("adminFullName")}
              >
                <input {...register("adminFullName")} />
              </Field>
              <Field label="Admin email" error={fieldError("adminEmail")}>
                <input {...register("adminEmail")} />
              </Field>
              <Field label="Admin phone" error={fieldError("adminPhone")}>
                <input {...register("adminPhone")} />
              </Field>
              <Field
                label="Temporary password"
                error={fieldError("temporaryPassword")}
              >
                <div className="input-action">
                  <input {...register("temporaryPassword")} />
                  <button
                    onClick={() => {
                      setValue(
                        "temporaryPassword",
                        generateTemporaryPassword(),
                        {
                          shouldDirty: true,
                          shouldValidate: true,
                        },
                      );
                    }}
                    type="button"
                  >
                    <Wand2 aria-hidden="true" />
                    Generate
                  </button>
                </div>
              </Field>
            </div>
          )}
        </section>
      )}

      <div className="form-actions">
        <button disabled={isSubmitting} type="submit">
          {isSubmitting ? (
            <Loader2 className="spin" aria-hidden="true" />
          ) : (
            <Save aria-hidden="true" />
          )}
          {mode === "create" ? "Create College" : "Save Changes"}
        </button>
        {mode === "create" && (
          <div className="inline-chip">
            <KeyRound aria-hidden="true" />
            Passwords are hashed before storage
          </div>
        )}
      </div>
    </form>
  );
}

function Field({
  children,
  error,
  label,
}: {
  children: React.ReactNode;
  error: string | null;
  label: string;
}) {
  return (
    <label className="form-field">
      <span>{label}</span>
      {children}
      {error && <small>{error}</small>}
    </label>
  );
}
