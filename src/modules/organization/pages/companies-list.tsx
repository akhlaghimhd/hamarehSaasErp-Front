/**
 * FE-ORG — فهرست شرکت‌ها + گیت multi_company
 */
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Building2, Loader2, Pencil, Plus, RotateCcw, Search, Sparkles } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { StatusChip } from "@/shared/components/data-display/status-chip";
import { EmptyState } from "@/shared/components/feedback/empty-state";
import { Input } from "@/shared/components/ui/input";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/shared/components/ui/sheet";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import {
  useCompanies,
  useCreateCompany,
  useUpdateCompany,
} from "../hooks/use-companies";
import { FEATURE_PACK_CODES, useFeaturePackEnabled } from "../hooks/use-feature-packs";
import type { CompanyListFilter } from "../services/company-service";
import {
  OrganizationPermissions,
  ENTITY_KIND_LABELS,
  ENTITY_KIND_FIELD_LABEL,
  ENTITY_KIND_OPTIONS,
  type CompanyDto,
} from "../types";
import { companyDetailPath } from "../lib/company-ref";
import {
  MSG_LOAD,
  MSG_ERR,
  MSG_NO_ACCESS,
  type StatusFilter,
  type CompanyForm,
  emptyForm,
  companyToForm,
  displayName,
  fd,
} from "./companies-list-helpers";

function isRecentCreated(iso?: string | null, days = 3): boolean {
  if (!iso) return false;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= days * 86_400_000;
}

export function CompaniesListPage() {
  const canView = usePermission(OrganizationPermissions.companyView);
  const canCreate = usePermission(OrganizationPermissions.companyCreate);
  const canUpdate = usePermission(OrganizationPermissions.companyUpdate);
  const { enabled: hasMultiCompany, isLoading: multiCompanyPackLoading } =
    useFeaturePackEnabled(FEATURE_PACK_CODES.multiCompany);

  const [membershipFilter, setMembershipFilter] = useState<CompanyListFilter>("active");
  const { data, isLoading, isError, error, refetch, isFetching } = useCompanies(membershipFilter);
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany();

  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyDto | null>(null);
  const form = useForm<CompanyForm>({ defaultValues: emptyForm() });
  const dirtyRef = useRef(false);
  dirtyRef.current = form.formState.isDirty;

  const rows = useMemo(() => data ?? [], [data]);
  const createBlockedByPack =
    !multiCompanyPackLoading && !hasMultiCompany && rows.length >= 1;

  useEffect(() => {
    setPage(1);
  }, [membershipFilter, statusFilter, query]);

  const filtered = useMemo(() => {
    let list = rows;
    if (membershipFilter === "active" && statusFilter !== "all") {
      list = list.filter((r) =>
        statusFilter === "active" ? r.is_active !== false : r.is_active === false
      );
    }
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((r) => {
        const blob = [r.name, r.legal_name, r.code, r.entity_kind]
          .map((x) => String(x ?? "").toLowerCase())
          .join(" ");
        return blob.includes(q);
      });
    }
    return [...list].sort((a, b) =>
      displayName(a).localeCompare(displayName(b), "fa")
    );
  }, [rows, membershipFilter, statusFilter, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize) || 1);
  const safePage = Math.min(page, totalPages);
  const pageRows = filtered.slice((safePage - 1) * pageSize, safePage * pageSize);

  function openCreate() {
    if (createBlockedByPack) {
      toast.message("بسته multi_company فعال نیست؛ ایجاد شرکت دوم مجاز نیست.");
      return;
    }
    setEditing(null);
    form.reset(emptyForm());
    setSheetOpen(true);
  }

  function openEdit(row: CompanyDto) {
    setEditing(row);
    form.reset(companyToForm(row));
    setSheetOpen(true);
  }

  async function onSubmit(values: CompanyForm) {
    try {
      if (editing) {
        await updateMutation.mutateAsync({
          companyId: editing.company_id,
          payload: {
            code: values.code,
            name: values.name,
            legal_name: values.legal_name,
            entity_kind: values.entity_kind,
            is_active: values.is_active,
          },
        });
        toast.success("شرکت به‌روزرسانی شد");
      } else {
        if (createBlockedByPack) {
          toast.message("بسته multi_company فعال نیست؛ ایجاد شرکت دوم مجاز نیست.");
          return;
        }
        await createMutation.mutateAsync({
          code: values.code,
          name: values.name,
          legal_name: values.legal_name,
          entity_kind: values.entity_kind,
          is_active: values.is_active,
        });
        toast.success("شرکت ایجاد شد");
      }
      setSheetOpen(false);
      form.reset(emptyForm());
      setEditing(null);
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : MSG_ERR);
    }
  }

  if (!canView) {
    return (
      <div className="p-6">
        <EmptyState title={MSG_NO_ACCESS} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="شرکت‌ها"
        description="مدیریت شرکت‌های مستأجر و نقش آن‌ها در گروه"
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "شرکت‌ها" },
        ]}
        icon={<Building2 className="h-4 w-4" />}
        actions={
          canCreate ? (
            <Button
              size="sm"
              onClick={openCreate}
              disabled={createBlockedByPack}
              title={createBlockedByPack ? "بسته multi_company لازم است" : undefined}
            >
              <Plus className="h-4 w-4" /> شرکت جدید
            </Button>
          ) : null
        }
      />

      {createBlockedByPack ? (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
          بسته <span className="font-mono">multi_company</span> برای این مستأجر فعال نیست.
          مشاهده مجاز است؛ ایجاد شرکت دوم مسدود است.
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-9 ps-9"
            placeholder="جستجو در نام، کد، نقش…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <Select
          value={membershipFilter}
          onValueChange={(v) => setMembershipFilter(v as CompanyListFilter)}
        >
          <SelectTrigger className="h-9 w-[150px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="active">موارد جاری</SelectItem>
            <SelectItem value="deleted">حذف‌شده‌ها</SelectItem>
          </SelectContent>
        </Select>
        {membershipFilter === "active" ? (
          <Select
            value={statusFilter}
            onValueChange={(v) => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className="h-9 w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">همه وضعیت‌ها</SelectItem>
              <SelectItem value="active">فعال</SelectItem>
              <SelectItem value="inactive">غیرفعال</SelectItem>
            </SelectContent>
          </Select>
        ) : null}
        <Button
          variant="outline"
          size="sm"
          className="h-9"
          onClick={() => void refetch()}
          disabled={isFetching}
        >
          {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : isError ? (
        <EmptyState
          title={MSG_LOAD}
          description={error instanceof Error ? error.message : MSG_ERR}
          actionLabel="تلاش مجدد"
          onAction={() => void refetch()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="شرکتی یافت نشد"
          actionLabel={canCreate && !createBlockedByPack ? "شرکت جدید" : undefined}
          onAction={canCreate && !createBlockedByPack ? openCreate : undefined}
        />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>کد</TableHead>
                <TableHead>{ENTITY_KIND_FIELD_LABEL}</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead className="w-[120px]">عملیات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pageRows.map((row) => (
                <TableRow key={row.company_id}>
                  <TableCell>
                    <Link
                      href={companyDetailPath(row.company_id)}
                      className="font-medium text-primary hover:underline"
                    >
                      {displayName(row)}
                    </Link>
                    {isRecentCreated(row.created_at) ? (
                      <Sparkles className="ms-1 inline h-3.5 w-3.5 text-amber-500" />
                    ) : null}
                  </TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">
                    {row.code || "—"}
                  </TableCell>
                  <TableCell>
                    {ENTITY_KIND_LABELS[row.entity_kind as string] ?? row.entity_kind ?? "—"}
                  </TableCell>
                  <TableCell>
                    <StatusChip
                      tone={row.is_active !== false ? "success" : "neutral"}
                      label={row.is_active !== false ? "فعال" : "غیرفعال"}
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      {canUpdate && membershipFilter === "active" ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={() => openEdit(row)}
                          aria-label="ویرایش"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="flex items-center justify-between border-t px-3 py-2 text-sm text-muted-foreground">
            <span>
              {fd(String(filtered.length))} مورد · صفحه {fd(String(safePage))} از{" "}
              {fd(String(totalPages))}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                قبلی
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                بعدی
              </Button>
            </div>
          </div>
        </div>
      )}

      <Sheet
        open={sheetOpen}
        onOpenChange={(open) => {
          if (!open && dirtyRef.current) {
            if (!window.confirm("تغییرات ذخیره نشده. خارج می‌شوید؟")) return;
          }
          setSheetOpen(open);
          if (!open) {
            setEditing(null);
            form.reset(emptyForm());
          }
        }}
      >
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle>{editing ? "ویرایش شرکت" : "شرکت جدید"}</SheetTitle>
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
              <Input {...form.register("legal_name", { required: true })} />
            </div>
            <div className="space-y-1">
              <Label>{ENTITY_KIND_FIELD_LABEL}</Label>
              <Select
                value={form.watch("entity_kind") || "OPERATING"}
                onValueChange={(v) => form.setValue("entity_kind", v, { shouldDirty: true })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENTITY_KIND_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
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
              <Button type="submit" disabled={createMutation.isPending || updateMutation.isPending}>
                {createMutation.isPending || updateMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editing ? (
                  "ذخیره"
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
