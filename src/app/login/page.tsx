/**
 * FE-P0-T04 — Login page (RTL, Persian, RHF + Zod)
 * Field errors under inputs (UI-04). No full page reload after submit.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { authService, useAuthStore } from "@/auth";
import { ApiClientError } from "@/api";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "ایمیل الزامی است")
    .email("فرمت ایمیل معتبر نیست"),
  password: z.string().min(6, "رمز عبور حداقل ۶ کاراکتر باشد"),
  tenant_id: z.string().min(1, "شناسه مستأجر الزامی است"),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const isHydrated = useAuthStore((s) => s.isHydrated);
  const hydrate = useAuthStore((s) => s.hydrate);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
      tenant_id: "",
    },
  });

  useEffect(() => {
    if (!isHydrated) hydrate();
  }, [isHydrated, hydrate]);

  useEffect(() => {
    if (isHydrated && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isHydrated, isAuthenticated, router]);

  const onSubmit = async (values: LoginFormValues) => {
    setFormError(null);
    try {
      await authService.login({
        email: values.email.trim(),
        password: values.password,
        tenant_id: values.tenant_id.trim(),
      });
      toast.success("ورود با موفقیت انجام شد");
      router.replace("/dashboard");
    } catch (err) {
      if (err instanceof ApiClientError) {
        if (err.isValidationError && err.errors) {
          Object.entries(err.errors).forEach(([field, messages]) => {
            const key = field as keyof LoginFormValues;
            if (key === "email" || key === "password" || key === "tenant_id") {
              setError(key, { message: messages[0] ?? "نامعتبر" });
            }
          });
        }
        setFormError(err.message);
        toast.error(err.message);
        return;
      }
      const message = "ورود ناموفق بود. دوباره تلاش کنید.";
      setFormError(message);
      toast.error(message);
    }
  };

  if (!isHydrated) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6">
        <p className="text-sm text-muted-foreground">در حال آماده‌سازی...</p>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md shadow-[var(--shadow-md)]">
        <CardHeader className="space-y-1">
          <CardTitle className="text-xl">ورود به هماره ERP</CardTitle>
          <CardDescription>
            برای ادامه، ایمیل، رمز عبور و شناسه مستأجر را وارد کنید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <div className="space-y-2">
              <Label htmlFor="tenant_id">
                شناسه مستأجر <span className="text-destructive">*</span>
              </Label>
              <Input
                id="tenant_id"
                autoComplete="organization"
                dir="ltr"
                className="text-left"
                placeholder="tenant-uuid"
                aria-invalid={!!errors.tenant_id}
                {...register("tenant_id")}
              />
              {errors.tenant_id && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.tenant_id.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">
                ایمیل <span className="text-destructive">*</span>
              </Label>
              <Input
                id="email"
                type="email"
                autoComplete="username"
                dir="ltr"
                className="text-left"
                placeholder="user@example.com"
                aria-invalid={!!errors.email}
                {...register("email")}
              />
              {errors.email && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">
                رمز عبور <span className="text-destructive">*</span>
              </Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                dir="ltr"
                className="text-left"
                aria-invalid={!!errors.password}
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {formError && (
              <div
                className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive"
                role="alert"
                aria-live="polite"
              >
                {formError}
              </div>
            )}

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  در حال ورود...
                </>
              ) : (
                "ورود"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
