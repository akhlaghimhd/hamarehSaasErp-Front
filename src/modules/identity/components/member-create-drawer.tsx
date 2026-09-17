"use client";

import { useEffect, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2, RefreshCw } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Checkbox } from "@/shared/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/shared/components/form/form";
import { Separator } from "@/shared/components/ui/separator";
import { ApiClientError } from "@/api";
import { useCreateTenantUser } from "../hooks/use-tenant-users";
import { tenantUserService } from "../services/tenant-user-service";
import { roleService, type RoleDto } from "../services/role-service";
import {
  createMemberSchema,
  normalizeIranMobile,
  type CreateMemberFormValues,
} from "../validations/member-schema";
import {
  slugNamePart,
  suggestEmailLocalPart,
} from "../lib/transliterate-fa";
import { MSG_GENERIC_ERROR } from "../lib/ui-copy";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated?: () => void;
};

export function MemberCreateDrawer({ open, onOpenChange, onCreated }: Props) {
  const createMutation = useCreateTenantUser();
  const [emailHost, setEmailHost] = useState<string | null>(null);
  const [hostLoading, setHostLoading] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);

  const form = useForm<CreateMemberFormValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      mobile: "",
      email_local_part: "",
      role_id: undefined,
      is_owner: false,
    },
    mode: "onTouched",
  });

  const firstName = useWatch({ control: form.control, name: "first_name" });
  const lastName = useWatch({ control: form.control, name: "last_name" });
  const latinFirst = slugNamePart(firstName ?? "");
  const latinLast = slugNamePart(lastName ?? "");
  const { isDirty } = form.formState;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setHostLoading(true);
    setHostError(null);
    tenantUserService
      .getEmailHost()
      .then((d) => {
        if (!cancelled) setEmailHost(d.email_host);
      })
      .catch((e) => {
        if (!cancelled) {
          setEmailHost(null);
          setHostError(
            e instanceof ApiClientError
              ? e.message
              : "دامنه ایمیل سازمانی در دسترس نیست."
          );
        }
      })
      .finally(() => {
        if (!cancelled) setHostLoading(false);
      });

    setRolesLoading(true);
    roleService
      .list()
      .then((list) => {
        if (!cancelled) {
          setRoles(
            list.filter((r) => r.status === undefined || Number(r.status) === 1)
          );
        }
      })
      .catch(() => {
        if (!cancelled) setRoles([]);
      })
      .finally(() => {
        if (!cancelled) setRolesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    form.setValue(
      "email_local_part",
      suggestEmailLocalPart(firstName ?? "", lastName ?? ""),
      { shouldValidate: false, shouldDirty: false }
    );
  }, [firstName, lastName, form, open]);

  const resyncEmail = () => {
    form.setValue(
      "email_local_part",
      suggestEmailLocalPart(
        form.getValues("first_name"),
        form.getValues("last_name")
      ),
      { shouldValidate: true }
    );
  };

  /** بستن عمدی فقط با انصراف / ضربدر — کلیک بیرون وقتی dirty مسدود است */
  const closeDrawer = () => {
    form.reset();
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset();
    }
    onOpenChange(next);
  };

  const saveMember = async (
    values: CreateMemberFormValues,
    options: { keepOpen: boolean }
  ) => {
    if (!emailHost) {
      toast.error(hostError ?? "دامنه ایمیل سازمانی در دسترس نیست.");
      return;
    }
    try {
      await createMutation.mutateAsync({
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        mobile: values.mobile,
        email_local_part: values.email_local_part.trim().toLowerCase(),
        is_owner: values.is_owner ?? false,
        role_ids: values.role_id ? [values.role_id] : [],
      });
      toast.success("کاربر با موفقیت اضافه شد");
      form.reset();
      onCreated?.();
      if (!options.keepOpen) {
        onOpenChange(false);
      }
    } catch (e) {
      toast.error(
        e instanceof ApiClientError && e.message ? e.message : MSG_GENERIC_ERROR
      );
    }
  };

  const onSubmit = form.handleSubmit((values) =>
    saveMember(values, { keepOpen: false })
  );

  const onSubmitAndAddAnother = form.handleSubmit((values) =>
    saveMember(values, { keepOpen: true })
  );

  const hostBlocked = !hostLoading && !emailHost;
  const submitDisabled =
    hostBlocked || hostLoading || createMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg"
        onInteractOutside={(e) => {
          if (isDirty) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isDirty) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (isDirty) e.preventDefault();
        }}
      >
        <SheetHeader>
          <SheetTitle>افزودن کاربر</SheetTitle>
          <SheetDescription>
            هویت، ایمیل سازمانی و دسترسی را در یک مرحله تکمیل کنید.
          </SheetDescription>
        </SheetHeader>

        <Form {...form}>
          <form
            onSubmit={onSubmit}
            className="flex min-h-0 flex-1 flex-col"
            noValidate
          >
            <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
              {hostBlocked ? (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">
                  {hostError}
                </div>
              ) : null}

              <section className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">هویت</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="first_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>نام</FormLabel>
                        <FormControl>
                          <Input className="h-9" autoComplete="given-name" {...field} />
                        </FormControl>
                        {latinFirst ? (
                          <p className="truncate font-mono text-[10px] text-muted-foreground" dir="ltr">
                            {latinFirst}
                          </p>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="last_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel required>نام خانوادگی</FormLabel>
                        <FormControl>
                          <Input className="h-9" autoComplete="family-name" {...field} />
                        </FormControl>
                        {latinLast ? (
                          <p className="truncate font-mono text-[10px] text-muted-foreground" dir="ltr">
                            {latinLast}
                          </p>
                        ) : null}
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="mobile"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel required>موبایل</FormLabel>
                      <FormControl>
                        <Input
                          className="h-9 tabular-nums"
                          dir="ltr"
                          inputMode="numeric"
                          autoComplete="tel"
                          placeholder="09121234567"
                          maxLength={11}
                          value={field.value}
                          onBlur={field.onBlur}
                          name={field.name}
                          ref={field.ref}
                          onChange={(e) =>
                            field.onChange(normalizeIranMobile(e.target.value))
                          }
                        />
                      </FormControl>
                      <FormDescription>
                        ۱۱ رقم، شروع با ۰۹
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="email_local_part"
                  render={({ field }) => (
                    <FormItem>
                      <div className="flex items-center justify-between gap-2">
                        <FormLabel required>ایمیل سازمانی</FormLabel>
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground"
                          onClick={resyncEmail}
                        >
                          <RefreshCw className="h-3 w-3" />
                          از نام
                        </button>
                      </div>
                      <div
                        className="flex h-9 overflow-hidden rounded-md border border-input bg-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-1"
                        dir="ltr"
                      >
                        <FormControl>
                          <input
                            className="h-full min-w-0 flex-1 border-0 bg-transparent px-2.5 font-mono text-sm outline-none disabled:opacity-50"
                            autoComplete="off"
                            placeholder="first.last"
                            disabled={hostBlocked || hostLoading}
                            value={field.value}
                            onChange={(e) =>
                              field.onChange(
                                e.target.value
                                  .toLowerCase()
                                  .replace(/[^a-z0-9._-]/g, "")
                              )
                            }
                            onBlur={field.onBlur}
                            name={field.name}
                            ref={field.ref}
                          />
                        </FormControl>
                        <span className="flex shrink-0 items-center border-l border-input bg-muted/40 px-2.5 font-mono text-xs text-muted-foreground">
                          @{hostLoading ? "…" : emailHost ?? "—"}
                        </span>
                      </div>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </section>

              <Separator />

              <section className="space-y-3">
                <h3 className="text-sm font-medium text-foreground">دسترسی</h3>

                <FormField
                  control={form.control}
                  name="role_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>نقش</FormLabel>
                      <Select
                        value={field.value ?? "__none__"}
                        onValueChange={(v) =>
                          field.onChange(v === "__none__" ? undefined : v)
                        }
                        disabled={rolesLoading}
                      >
                        <FormControl>
                          <SelectTrigger className="h-9">
                            <SelectValue
                              placeholder={
                                rolesLoading ? "بارگذاری…" : "انتخاب نقش"
                              }
                            />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="__none__">بدون نقش</SelectItem>
                          {roles.map((r) => (
                            <SelectItem
                              key={r.tenant_role_id}
                              value={r.tenant_role_id}
                            >
                              {r.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormDescription>
                        می‌توانید بعداً از جزئیات کاربر هم تغییر دهید
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="is_owner"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start gap-3 space-y-0 rounded-md border border-border/60 px-3 py-3">
                      <FormControl>
                        <Checkbox
                          className="mt-0.5"
                          checked={Boolean(field.value)}
                          onCheckedChange={(v) => field.onChange(Boolean(v))}
                        />
                      </FormControl>
                      <div className="space-y-0.5 leading-snug">
                        <FormLabel className="font-medium">
                          مدیر اصلی سازمان
                        </FormLabel>
                        <FormDescription>
                          فقط در صورت نیاز علامت بزنید
                        </FormDescription>
                      </div>
                    </FormItem>
                  )}
                />
              </section>
            </div>

            <SheetFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeDrawer}
                disabled={createMutation.isPending}
              >
                انصراف
              </Button>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                disabled={submitDisabled}
                onClick={() => void onSubmitAndAddAnother()}
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    در حال ثبت…
                  </>
                ) : (
                  "ثبت و افزودن بعدی"
                )}
              </Button>
              <Button type="submit" size="sm" disabled={submitDisabled}>
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    در حال ثبت…
                  </>
                ) : (
                  "ثبت کاربر"
                )}
              </Button>
            </SheetFooter>
          </form>
        </Form>
      </SheetContent>
    </Sheet>
  );
}
