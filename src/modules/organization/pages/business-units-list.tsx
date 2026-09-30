/**
 * FE-ORG — واحدهای کسب‌وکار با گیت multi_business_unit + فرم ایجاد
 */
"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Layers, Loader2, Plus, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Switch } from "@/shared/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { usePermission } from "@/auth";
import { ApiClientError, tokenStorage } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import { FEATURE_PACK_CODES, useFeaturePackEnabled } from "../hooks/use-feature-packs";
import { businessUnitService, type BusinessUnitDto } from "../services/org-extended-service";
import { OrganizationPermissions } from "../types";

type BuForm = { code: string; name: string; description: string; is_active: boolean };

const emptyForm = (): BuForm => ({
  code: "",
  name: "",
  description: "",
  is_active: true,
});

function hasAuthContext(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean(tokenStorage.getAccessToken() && tokenStorage.getTenantId());
}

export function BusinessUnitsListPage() {
  const qc = useQueryClient();
  const canView =
    usePermission(OrganizationPermissions.businessUnitView) ||
    usePermission(OrganizationPermissions.companyView);
  const canManage =
    usePermission(OrganizationPermissions.businessUnitManage) ||
    usePermission(OrganizationPermissions.companyUpdate);
  const { enabled: hasMultiBu, isLoading: packLoading } = useFeaturePackEnabled(
    FEATURE_PACK_CODES.multiBusinessUnit
  );
  const createBuBlocked = !packLoading && !hasMultiBu;
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const form = useForm<BuForm>({ defaultValues: emptyForm() });

  const listQuery = useQuery({
    queryKey: ["org", "business-units", "active"],
    queryFn: () => businessUnitService.list({ membership: "active" }),
    enabled: hasAuthContext() && canView,
  });

  const rows = useMemo(() => {
    const list = (listQuery.data ?? []) as BusinessUnitDto[];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      [r.name, r.code, r.description]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ")
        .includes(q)
    );
  }, [listQuery.data, query]);

  function openCreate() {
    if (createBuBlocked) {
      toast.message("بسته multi_business_unit فعال نیست؛ ایجاد واحد کسب‌وکار مجاز نیست.");
      return;
    }
    form.reset(emptyForm());
    setSheetOpen(true);
  }

  async function onSubmit(values: BuForm) {
    if (createBuBlocked) {
      toast.message("بسته multi_business_unit فعال نیست؛ ایجاد واحد کسب‌وکار مجاز نیست.");
      return;
    }
    setBusy(true);
    try {
      await businessUnitService.create({
        code: values.code.trim(),
        name: values.name.trim(),
        description: values.description.trim() || undefined,
        is_active: values.is_active,
      });
      toast.success("واحد کسب‌وکار ایجاد شد");
      setSheetOpen(false);
      form.reset(emptyForm());
      void qc.invalidateQueries({ queryKey: ["org", "business-units"] });
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "خطا در ایجاد واحد");
    } finally {
      setBusy(false);
    }
  }

  if (!canView) {
    return (
      <div className="p-6">
        <EmptyState title="مجوز مشاهده واحد کسب‌وکار را ندارید" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="واحدهای کسب‌وکار"
        description="بخش‌بندی مدیریتی مستقل از ساختار حقوقی"
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "واحد کسب‌وکار" },
        ]}
        icon={<Layers className="h-4 w-4" />}
        actions={
          canManage ? (
            <Button
              size="sm"
              onClick={openCreate}
              disabled={createBuBlocked}
              title={createBuBlocked ? "بسته multi_business_unit لازم است" : undefined}
            >
              <Plus className="h-4 w-4" /> واحد جدید
            </Button>
          ) : null
        }
      />

      {createBuBlocked ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          بسته <span className="font-mono">multi_business_unit</span> فعال نیست. ایجاد BU مسدود است.
        </div>
      ) : null}

      <div className="relative max-w-md">
        <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 ps-9"
          placeholder="جستجو…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {listQuery.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : listQuery.isError ? (
        <EmptyState
          title="بارگذاری ناموفق"
          actionLabel="تلاش مجدد"
          onAction={() => void listQuery.refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="واحد کسب‌وکاری یافت نشد"
          actionLabel={canManage && !createBuBlocked ? "واحد جدید" : undefined}
          onAction={canManage && !createBuBlocked ? openCreate : undefined}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>کد</TableHead>
                <TableHead>وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.business_unit_id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">
                    {row.code || "—"}
                  </TableCell>
                  <TableCell>
                    <StatusChip
                      tone={row.is_active !== false ? "success" : "neutral"}
                      label={row.is_active !== false ? "فعال" : "غیرفعال"}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t px-3 py-2 text-sm text-muted-foreground">
            {toFaDigits(String(rows.length))} واحد
            {listQuery.isFetching ? (
              <Loader2 className="ms-2 inline h-3.5 w-3.5 animate-spin" />
            ) : null}
          </div>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>واحد کسب‌وکار جدید</SheetTitle>
          </SheetHeader>
          <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <Label>کد</Label>
              <Input {...form.register("code", { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>نام</Label>
              <Input {...form.register("name", { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>توضیح</Label>
              <Input {...form.register("description")} />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={form.watch("is_active") !== false}
                onCheckedChange={(c) => form.setValue("is_active", c, { shouldDirty: true })}
              />
              <Label>فعال</Label>
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                انصراف
              </Button>
              <Button type="submit" disabled={busy || createBuBlocked}>
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "ایجاد"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
