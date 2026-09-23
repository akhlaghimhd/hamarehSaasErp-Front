"use client";

import { useAuthStore } from "@/auth";

import { useEffect, useMemo, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronLeft,
  Loader2,
  RefreshCw,
  Search,
} from "lucide-react";
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
import { cn } from "@/shared/lib/utils";
import { useCreateTenantUser } from "../hooks/use-tenant-users";
import { tenantUserService } from "../services/tenant-user-service";
import { roleService, type RoleDto } from "../services/role-service";
import { scopeService, type ScopeDto } from "../services/scope-service";
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

type RoleNode = RoleDto & {
  parent_role_id?: string | null;
  children: RoleNode[];
};

function buildRoleTree(roles: RoleDto[]): RoleNode[] {
  const map = new Map<string, RoleNode>();
  for (const r of roles) {
    map.set(r.tenant_role_id, {
      ...r,
      parent_role_id:
        (r as RoleDto & { parent_role_id?: string | null }).parent_role_id ??
        null,
      children: [],
    });
  }
  const roots: RoleNode[] = [];
  for (const node of map.values()) {
    const pid = node.parent_role_id;
    if (pid && map.has(pid)) {
      map.get(pid)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  const sortFn = (a: RoleNode, b: RoleNode) =>
    (a.name || "").localeCompare(b.name || "", "fa");
  const sortRec = (nodes: RoleNode[]) => {
    nodes.sort(sortFn);
    nodes.forEach((n) => sortRec(n.children));
  };
  sortRec(roots);
  return roots;
}

function filterRoleTree(nodes: RoleNode[], q: string): RoleNode[] {
  if (!q.trim()) return nodes;
  const needle = q.trim().toLowerCase();
  const walk = (list: RoleNode[]): RoleNode[] => {
    const out: RoleNode[] = [];
    for (const n of list) {
      const kids = walk(n.children);
      const selfMatch =
        (n.name || "").toLowerCase().includes(needle) ||
        (n.code || "").toLowerCase().includes(needle);
      if (selfMatch || kids.length > 0) out.push({ ...n, children: kids });
    }
    return out;
  };
  return walk(nodes);
}

function RoleTreePickRow({
  node,
  depth,
  selected,
  expanded,
  onToggleExpand,
  onToggle,
}: {
  node: RoleNode;
  depth: number;
  selected: Set<string>;
  expanded: Set<string>;
  onToggleExpand: (id: string) => void;
  onToggle: (id: string) => void;
}) {
  const hasChildren = node.children.length > 0;
  const isOpen = expanded.has(node.tenant_role_id);
  const isChecked = selected.has(node.tenant_role_id);
  return (
    <div>
      <div
        className="flex items-center gap-2 py-1.5 text-sm"
        style={{ paddingInlineStart: `${depth * 1.15 + 0.25}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-muted"
            onClick={() => onToggleExpand(node.tenant_role_id)}
            aria-label={isOpen ? "بستن" : "باز کردن"}
          >
            {isOpen ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronLeft className="h-3.5 w-3.5" />
            )}
          </button>
        ) : (
          <span className="inline-block w-6 shrink-0" />
        )}
        <Checkbox
          checked={isChecked}
          onCheckedChange={() => onToggle(node.tenant_role_id)}
        />
        <span className="min-w-0 flex-1 truncate">{node.name}</span>
      </div>
      {hasChildren && isOpen
        ? node.children.map((c) => (
            <RoleTreePickRow
              key={c.tenant_role_id}
              node={c}
              depth={depth + 1}
              selected={selected}
              expanded={expanded}
              onToggleExpand={onToggleExpand}
              onToggle={onToggle}
            />
          ))
        : null}
    </div>
  );
}

export function MemberCreateDrawer({ open, onOpenChange, onCreated }: Props) {
  const createMutation = useCreateTenantUser();
  const [emailHost, setEmailHost] = useState<string | null>(null);
  const [hostLoading, setHostLoading] = useState(false);
  const [hostError, setHostError] = useState<string | null>(null);
  const [roles, setRoles] = useState<RoleDto[]>([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [scopes, setScopes] = useState<ScopeDto[]>([]);
  const [scopesLoading, setScopesLoading] = useState(false);
  const [roleQuery, setRoleQuery] = useState("");
  const [scopeQuery, setScopeQuery] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const canManageOwner = useAuthStore((s) => s.securityContext?.is_owner === true);

  const form = useForm<CreateMemberFormValues>({
    resolver: zodResolver(createMemberSchema),
    defaultValues: {
      first_name: "",
      last_name: "",
      mobile: "",
      email_local_part: "",
      role_ids: [],
      scope_ids: [],
      is_owner: false,
    },
    mode: "onTouched",
  });

  const firstName = useWatch({ control: form.control, name: "first_name" });
  const lastName = useWatch({ control: form.control, name: "last_name" });
  const roleIds = useWatch({ control: form.control, name: "role_ids" }) ?? [];
  const scopeIds = useWatch({ control: form.control, name: "scope_ids" }) ?? [];
  const latinFirst = slugNamePart(firstName ?? "");
  const latinLast = slugNamePart(lastName ?? "");
  const { isDirty } = form.formState;

  const roleTree = useMemo(() => buildRoleTree(roles), [roles]);
  const filteredRoles = useMemo(
    () => filterRoleTree(roleTree, roleQuery),
    [roleTree, roleQuery]
  );
  const filteredScopes = useMemo(() => {
    const q = scopeQuery.trim().toLowerCase();
    if (!q) return scopes;
    return scopes.filter(
      (s) =>
        (s.scope_name || "").toLowerCase().includes(q) ||
        (s.scope_type || "").toLowerCase().includes(q)
    );
  }, [scopes, scopeQuery]);
  const selectedRoles = useMemo(() => new Set(roleIds), [roleIds]);
  const selectedScopes = useMemo(() => new Set(scopeIds), [scopeIds]);

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

    setScopesLoading(true);
    scopeService
      .list()
      .then((list) => {
        if (!cancelled) {
          setScopes(list.filter((s) => s.is_active !== false));
        }
      })
      .catch(() => {
        if (!cancelled) setScopes([]);
      })
      .finally(() => {
        if (!cancelled) setScopesLoading(false);
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

  useEffect(() => {
    if (!open) return;
    const next = new Set<string>();
    const walk = (nodes: RoleNode[]) => {
      for (const n of nodes) {
        if (n.children.length > 0) {
          next.add(n.tenant_role_id);
          walk(n.children);
        }
      }
    };
    walk(filteredRoles);
    setExpanded(next);
  }, [open, roleQuery, filteredRoles]);

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

  const toggleRole = (id: string) => {
    const cur = new Set(form.getValues("role_ids") ?? []);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    form.setValue("role_ids", Array.from(cur), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const toggleScope = (id: string) => {
    const cur = new Set(form.getValues("scope_ids") ?? []);
    if (cur.has(id)) cur.delete(id);
    else cur.add(id);
    form.setValue("scope_ids", Array.from(cur), {
      shouldDirty: true,
      shouldValidate: true,
    });
  };

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const closeDrawer = () => {
    form.reset();
    setRoleQuery("");
    setScopeQuery("");
    onOpenChange(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      form.reset();
      setRoleQuery("");
      setScopeQuery("");
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
      const created = await createMutation.mutateAsync({
        first_name: values.first_name.trim(),
        last_name: values.last_name.trim(),
        mobile: values.mobile,
        email_local_part: values.email_local_part.trim().toLowerCase(),
        is_owner: canManageOwner ? (values.is_owner ?? false) : false,
        role_ids: values.role_ids ?? [],
      });
      const scopeIdsToAssign = values.scope_ids ?? [];
      if (scopeIdsToAssign.length > 0 && created?.tenant_user_id) {
        try {
          await scopeService.assignToUser(
            created.tenant_user_id,
            scopeIdsToAssign
          );
        } catch {
          toast.message("کاربر ثبت شد؛ تخصیص محدوده را بعداً از جزئیات انجام دهید.");
        }
      }
      toast.success("کاربر اضافه شد.");
      form.reset();
      setRoleQuery("");
      setScopeQuery("");
      onCreated?.();
      if (!options.keepOpen) onOpenChange(false);
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
            مشخصات کاربر، نقش و محدوده دسترسی را وارد کنید.
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
                      <FormDescription>شماره موبایل ۱۱ رقمی با ۰۹</FormDescription>
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
                          پیشنهاد از نام
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
                  name="role_ids"
                  render={() => (
                    <FormItem>
                      <FormLabel>نقش‌ها</FormLabel>
                      <div className="relative mb-2">
                        <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="h-8 ps-8"
                          placeholder="جستجوی نقش…"
                          value={roleQuery}
                          onChange={(e) => setRoleQuery(e.target.value)}
                          disabled={rolesLoading}
                        />
                      </div>
                      {rolesLoading ? (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          بارگذاری نقش‌ها…
                        </p>
                      ) : roles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">نقشی تعریف نشده است.</p>
                      ) : filteredRoles.length === 0 ? (
                        <p className="text-sm text-muted-foreground">نقشی با این جستجو پیدا نشد.</p>
                      ) : (
                        <div className="max-h-48 overflow-y-auto rounded-lg border border-border/40 px-1 py-1">
                          {filteredRoles.map((n) => (
                            <RoleTreePickRow
                              key={n.tenant_role_id}
                              node={n}
                              depth={0}
                              selected={selectedRoles}
                              expanded={expanded}
                              onToggleExpand={toggleExpand}
                              onToggle={toggleRole}
                            />
                          ))}
                        </div>
                      )}
                      <FormDescription>می‌توانید چند نقش انتخاب کنید.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="scope_ids"
                  render={() => (
                    <FormItem>
                      <FormLabel>محدوده‌های دسترسی</FormLabel>
                      <div className="relative mb-2">
                        <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          className="h-8 ps-8"
                          placeholder="جستجوی محدوده…"
                          value={scopeQuery}
                          onChange={(e) => setScopeQuery(e.target.value)}
                          disabled={scopesLoading}
                        />
                      </div>
                      {scopesLoading ? (
                        <p className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          بارگذاری محدوده‌ها…
                        </p>
                      ) : scopes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">محدوده‌ای تعریف نشده است.</p>
                      ) : filteredScopes.length === 0 ? (
                        <p className="text-sm text-muted-foreground">محدوده‌ای با این جستجو پیدا نشد.</p>
                      ) : (
                        <div className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-border/40 px-2 py-1.5">
                          {filteredScopes.map((s) => {
                            const checked = selectedScopes.has(s.scope_id);
                            return (
                              <label
                                key={s.scope_id}
                                className={cn(
                                  "flex cursor-pointer items-center gap-2 rounded-md px-1.5 py-1.5 text-sm hover:bg-muted/50",
                                  checked && "bg-muted/40"
                                )}
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={() => toggleScope(s.scope_id)}
                                />
                                <span className="min-w-0 flex-1 truncate">{s.scope_name}</span>
                                {s.scope_type ? (
                                  <span className="shrink-0 text-[10px] text-muted-foreground">
                                    {s.scope_type}
                                  </span>
                                ) : null}
                              </label>
                            );
                          })}
                        </div>
                      )}
                      <FormDescription>اختیاری — بعداً هم قابل تخصیص است.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {canManageOwner ? (
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
                          <FormLabel className="font-medium">مدیر اصلی سازمان</FormLabel>
                          <FormDescription>
                            فقط مالک فعلی می‌تواند مالک جدید تعیین کند.
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />
                ) : null}
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
