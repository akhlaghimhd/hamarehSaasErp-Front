/** فهرست محدوده‌های دسترسی — انتخاب چندمرجعه‌ی هم‌نوع */

"use client";

import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { Loader2, Plus, Scan, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { cn } from "@/shared/lib/utils";
import { ApiClientError } from "@/api";
import { usePermission } from "@/auth";
import {
  useCreateScope,
  useScopes,
  useSoftDeleteScope,
} from "@/modules/identity/hooks/use-scopes";
import type { ScopeDto } from "@/modules/identity/services/scope-service";
import { companyService } from "@/modules/organization/services/company-service";
import { branchService } from "@/modules/organization/services/branch-service";

const STRUCTURAL = new Set([
  "COMPANY",
  "BRANCH",
  "WAREHOUSE",
  "DEPARTMENT",
  "COST_CENTER",
  "BUSINESS_UNIT",
]);

const TYPE_LABEL: Record<string, string> = {
  COMPANY: "شرکت",
  BRANCH: "شعبه",
  WAREHOUSE: "انبار",
  DEPARTMENT: "دپارتمان",
  COST_CENTER: "مرکز هزینه",
  BUSINESS_UNIT: "واحد کسب‌وکار",
  CUSTOM: "سفارشی",
};

type RefOption = { id: string; label: string };

type CreateForm = {
  scope_name: string;
  scope_type: string;
  reference_ids: string[];
  description: string;
};

function scopeTypeLabel(t: string) {
  return TYPE_LABEL[String(t).toUpperCase()] ?? t;
}

export function ScopesListPage() {
  const canView = usePermission("identity.scope.view");
  const canCreate = usePermission("identity.scope.create");
  const canDelete = usePermission("identity.scope.delete");

  const { data = [], isLoading, isError, error } = useScopes("active");
  const createMutation = useCreateScope();
  const deleteMutation = useSoftDeleteScope();

  const [createOpen, setCreateOpen] = useState(false);
  const [refOptions, setRefOptions] = useState<RefOption[]>([]);
  const [refLoading, setRefLoading] = useState(false);
  const [refSearch, setRefSearch] = useState("");

  const form = useForm<CreateForm>({
    defaultValues: {
      scope_name: "",
      scope_type: "BRANCH",
      reference_ids: [],
      description: "",
    },
  });

  const scopeType = form.watch("scope_type");
  const needsReference = STRUCTURAL.has(String(scopeType).toUpperCase());
  const selectedIds = form.watch("reference_ids") || [];

  useEffect(() => {
    if (!createOpen) return;
    form.setValue("reference_ids", []);
    setRefOptions([]);
    setRefSearch("");
    const type = String(scopeType).toUpperCase();
    if (!STRUCTURAL.has(type)) return;

    let cancelled = false;
    setRefLoading(true);
    (async () => {
      try {
        let options: RefOption[] = [];
        if (type === "COMPANY") {
          const list = await companyService.list("active");
          options = list
            .map((c) => {
              const id = c.company_id || (c as { id?: string }).id;
              if (!id) return null;
              return {
                id: String(id),
                label: c.name || c.legal_name || c.code || String(id),
              };
            })
            .filter(Boolean) as RefOption[];
        } else if (type === "BRANCH") {
          const list = await branchService.listAll("active");
          options = list
            .map((b) => {
              const id = b.branch_id || (b as { id?: string }).id;
              if (!id) return null;
              return {
                id: String(id),
                label: [b.name, b.code].filter(Boolean).join(" · ") || String(id),
              };
            })
            .filter(Boolean) as RefOption[];
        }
        if (!cancelled) setRefOptions(options);
      } catch {
        if (!cancelled) {
          setRefOptions([]);
          toast.error("بارگذاری موجودیت‌های مرجع ناموفق بود");
        }
      } finally {
        if (!cancelled) setRefLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [createOpen, scopeType, form]);

  const filteredRefs = useMemo(() => {
    const q = refSearch.trim().toLowerCase();
    if (!q) return refOptions;
    return refOptions.filter((o) => o.label.toLowerCase().includes(q));
  }, [refOptions, refSearch]);

  async function onCreateSubmit(values: CreateForm) {
    const name = values.scope_name.trim();
    if (!name) {
      toast.error("نام محدوده الزامی است");
      return;
    }
    const type = String(values.scope_type).toUpperCase();
    const refIds = (values.reference_ids || []).map(String).filter(Boolean);
    if (STRUCTURAL.has(type) && refIds.length === 0) {
      toast.error(
        `برای نوع «${scopeTypeLabel(type)}» حداقل یک مورد هم‌نوع را انتخاب کنید.`
      );
      return;
    }
    try {
      await createMutation.mutateAsync({
        scope_name: name,
        scope_type: type,
        reference_ids: refIds,
        reference_id: refIds[0] ?? null,
        description: values.description?.trim() || null,
        is_active: true,
      });
      toast.success("محدوده دسترسی ثبت شد");
      setCreateOpen(false);
      form.reset({
        scope_name: "",
        scope_type: "BRANCH",
        reference_ids: [],
        description: "",
      });
    } catch (e) {
      toast.error(
        e instanceof ApiClientError ? e.message : "خطا در ثبت محدوده"
      );
    }
  }

  async function onDelete(row: ScopeDto) {
    if (!canDelete) return;
    try {
      await deleteMutation.mutateAsync(row.scope_id);
      toast.success("محدوده حذف شد");
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "خطا در حذف");
    }
  }

  if (!canView) {
    return (
      <EmptyState
        title="دسترسی ندارید"
        description="مجوز مشاهده محدوده‌ها را ندارید."
      />
    );
  }

  return (
    <div className="flex min-h-0 flex-col gap-3">
      <PageHeader
        title="محدوده‌های دسترسی"
        description="هر محدوده یک نوع دارد و می‌تواند یک یا چند موجودیت هم‌نوع را پوشش دهد"
        icon={<Scan className="h-5 w-5" />}
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "هویت و دسترسی", href: "/dashboard/identity" },
          { label: "محدوده‌ها" },
        ]}
        actions={
          canCreate ? (
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              <Plus className="me-1.5 h-4 w-4" />
              محدوده جدید
            </Button>
          ) : null
        }
      />

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال بارگذاری…
        </div>
      ) : isError ? (
        <EmptyState
          title="خطا"
          description={error instanceof Error ? error.message : "بارگذاری ناموفق"}
        />
      ) : data.length === 0 ? (
        <EmptyState title="محدوده‌ای نیست" description="اولین محدوده را ثبت کنید." />
      ) : (
        <div className="overflow-hidden rounded-md border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-start">
              <tr>
                <th className="px-3 py-2 font-medium">نام</th>
                <th className="px-3 py-2 font-medium">نوع</th>
                <th className="px-3 py-2 font-medium">تعداد مرجع</th>
                <th className="px-3 py-2 font-medium">توضیح</th>
                <th className="px-3 py-2 font-medium w-20" />
              </tr>
            </thead>
            <tbody>
              {data.map((r) => {
                const count =
                  Array.isArray(r.reference_ids) && r.reference_ids.length > 0
                    ? r.reference_ids.length
                    : r.reference_id
                      ? 1
                      : 0;
                return (
                  <tr key={r.scope_id} className="border-t">
                    <td className="px-3 py-2">{r.scope_name}</td>
                    <td className="px-3 py-2">{scopeTypeLabel(r.scope_type)}</td>
                    <td className="px-3 py-2 tabular-nums">{count}</td>
                    <td className="px-3 py-2 text-muted-foreground">
                      {r.description || "—"}
                    </td>
                    <td className="px-3 py-2">
                      {canDelete ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => onDelete(r)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={createOpen} onOpenChange={setCreateOpen}>
        <SheetContent className="flex w-full flex-col sm:max-w-md">
          <SheetHeader>
            <SheetTitle>محدوده جدید</SheetTitle>
          </SheetHeader>
          <form
            className="flex min-h-0 flex-1 flex-col"
            onSubmit={form.handleSubmit(onCreateSubmit)}
          >
            <div className="flex-1 space-y-4 overflow-y-auto px-1 py-2">
              <div className="space-y-2">
                <Label>نام محدوده</Label>
                <Input className="h-9" {...form.register("scope_name")} />
              </div>
              <div className="space-y-2">
                <Label>نوع</Label>
                <Select
                  value={form.watch("scope_type")}
                  onValueChange={(v) =>
                    form.setValue("scope_type", v, { shouldDirty: true })
                  }
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {needsReference ? (
                <div className="space-y-2">
                  <Label>موجودیت‌های مرجع (هم‌نوع — یک یا چند)</Label>
                  {refLoading ? (
                    <div className="flex h-9 items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      بارگذاری فهرست…
                    </div>
                  ) : (
                    <div className="rounded-md border">
                      <div className="border-b p-1.5">
                        <Input
                          className="h-8"
                          placeholder="جستجو…"
                          value={refSearch}
                          onChange={(e) => setRefSearch(e.target.value)}
                        />
                      </div>
                      <div className="max-h-48 overflow-y-auto p-1">
                        {filteredRefs.length === 0 ? (
                          <p className="px-2 py-2 text-xs text-muted-foreground">
                            موردی نیست
                          </p>
                        ) : (
                          filteredRefs.map((o) => {
                            const selected = selectedIds.includes(o.id);
                            return (
                              <button
                                key={o.id}
                                type="button"
                                className={cn(
                                  "flex w-full items-center gap-2 rounded px-2 py-1.5 text-start text-sm hover:bg-muted/60",
                                  selected && "bg-primary/10 font-medium"
                                )}
                                onClick={() => {
                                  const next = selected
                                    ? selectedIds.filter((id) => id !== o.id)
                                    : [...selectedIds, o.id];
                                  form.setValue("reference_ids", next, {
                                    shouldDirty: true,
                                  });
                                }}
                              >
                                <span
                                  className={cn(
                                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px]",
                                    selected
                                      ? "border-primary bg-primary text-primary-foreground"
                                      : "border-muted-foreground/40"
                                  )}
                                >
                                  {selected ? "✓" : ""}
                                </span>
                                {o.label}
                              </button>
                            );
                          })
                        )}
                      </div>
                      {selectedIds.length > 0 ? (
                        <div className="border-t px-2 py-1.5 text-xs text-muted-foreground">
                          انتخاب‌شده: {selectedIds.length} مورد
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>توضیح (اختیاری)</Label>
                <Input className="h-9" {...form.register("description")} />
              </div>
            </div>
            <SheetFooter className="gap-2 border-t pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCreateOpen(false)}
              >
                انصراف
              </Button>
              <Button
                type="submit"
                disabled={
                  createMutation.isPending ||
                  (needsReference && selectedIds.length === 0)
                }
              >
                {createMutation.isPending ? "در حال ثبت…" : "ثبت محدوده"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default ScopesListPage;
