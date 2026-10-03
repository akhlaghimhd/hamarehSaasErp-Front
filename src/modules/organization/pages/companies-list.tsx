/**
 * FE-ORG — فهرست شرکت‌ها (restored clean UTF-8)
 */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Building2, Loader2, Plus, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import {
  useCompanies,
  useCreateCompany,
} from "../hooks/use-companies";
import { companyDetailPath } from "../lib/company-ref";
import {
  OrganizationPermissions,
  ENTITY_KIND_LABELS,
  type CompanyDto,
} from "../types";

type CompanyForm = {
  code: string;
  name: string;
  legal_name: string;
  entity_kind: string;
  is_active: boolean;
};

const emptyForm = (): CompanyForm => ({
  code: "",
  name: "",
  legal_name: "",
  entity_kind: "OPERATING",
  is_active: true,
});

export function CompaniesListPage() {
  const canView = usePermission(OrganizationPermissions.companyView);
  const canCreate = usePermission(OrganizationPermissions.companyCreate);
  const { data, isLoading, isError, refetch, isFetching } = useCompanies("active");
  const createMutation = useCreateCompany();
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const form = useForm<CompanyForm>({ defaultValues: emptyForm() });

  const rows = useMemo(() => {
    const list = (data ?? []) as CompanyDto[];
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      [r.name, r.legal_name, r.code]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ")
        .includes(q)
    );
  }, [data, query]);

  function openCreate() {
    form.reset(emptyForm());
    setSheetOpen(true);
  }

  async function onSubmit(values: CompanyForm) {
    try {
      await createMutation.mutateAsync({
        code: values.code.trim(),
        name: values.name.trim(),
        legal_name: values.legal_name.trim() || values.name.trim(),
        entity_kind: values.entity_kind || "OPERATING",
        is_active: values.is_active,
        status: values.is_active ? 1 : 2,
      });
      toast.success("شرکت ایجاد شد");
      setSheetOpen(false);
      form.reset(emptyForm());
      void refetch();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "خطا در ایجاد شرکت");
    }
  }

  if (!canView) {
    return (
      <div className="p-6">
        <EmptyState title="مجوز مشاهده شرکت‌ها را ندارید" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="شرکت‌ها"
        description="فهرست شرکت‌های مستأجر"
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "شرکت‌ها" },
        ]}
        icon={<Building2 className="h-4 w-4" />}
        actions={
          canCreate ? (
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> شرکت جدید
            </Button>
          ) : null
        }
      />

      <div className="relative max-w-md">
        <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="h-9 ps-9"
          placeholder="جستجو…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title="بارگذاری ناموفق"
          actionLabel="تلاش مجدد"
          onAction={() => void refetch()}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="شرکتی یافت نشد"
          actionLabel={canCreate ? "شرکت جدید" : undefined}
          onAction={canCreate ? openCreate : undefined}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>کد</TableHead>
                <TableHead>نوع</TableHead>
                <TableHead>وضعیت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.company_id}>
                  <TableCell className="font-medium">
                    <Link
                      href={companyDetailPath(row.company_id)}
                      className="text-primary hover:underline"
                    >
                      {row.legal_name || row.name || "—"}
                    </Link>
                  </TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">
                    {row.code || "—"}
                  </TableCell>
                  <TableCell>
                    {ENTITY_KIND_LABELS?.[row.entity_kind as string] ??
                      row.entity_kind ??
                      "—"}
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
            {toFaDigits(String(rows.length))} شرکت
            {isFetching ? (
              <Loader2 className="ms-2 inline h-3.5 w-3.5 animate-spin" />
            ) : null}
          </div>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>شرکت جدید</SheetTitle>
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
              <Label>نام قانونی</Label>
              <Input {...form.register("legal_name")} />
            </div>
            <div className="space-y-1">
              <Label>نوع</Label>
              <Select
                value={form.watch("entity_kind") || "OPERATING"}
                onValueChange={(v) => form.setValue("entity_kind", v, { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ENTITY_KIND_LABELS ?? { OPERATING: "عملیاتی" }).map(
                    ([k, v]) => (
                      <SelectItem key={k} value={k}>
                        {v}
                      </SelectItem>
                    )
                  )}
                </SelectContent>
              </Select>
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
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "ایجاد"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
