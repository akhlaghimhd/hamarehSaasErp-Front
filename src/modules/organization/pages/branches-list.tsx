/**
 * FE-ORG — فهرست شعب (clean UTF-8)
 */
"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { GitBranch, Loader2, Plus, Search } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/components/ui/table";
import { usePermission } from "@/auth";
import { ApiClientError } from "@/api";
import { toFaDigits } from "@/shared/lib/utils";
import { useCompanies } from "../hooks/use-companies";
import { useAllBranches, useCreateBranch } from "../hooks/use-branches";
import { companyDetailPath } from "../lib/company-ref";
import { OrganizationPermissions, BRANCH_KIND_LABELS, type BranchDto } from "../types";

type BranchForm = { company_id: string; code: string; name: string; address: string; branch_kind: string; is_active: boolean };
const emptyForm = (): BranchForm => ({ company_id: "", code: "", name: "", address: "", branch_kind: "OFFICE", is_active: true });

export function BranchesListPage() {
  const canView = usePermission(OrganizationPermissions.branchView);
  const canCreate = usePermission(OrganizationPermissions.branchCreate);
  const { data: companies } = useCompanies();
  const companyList = companies ?? [];
  const companyIds = useMemo(() => companyList.map((c) => c.company_id), [companyList]);
  const { data, isLoading, isError, refetch, isFetching } = useAllBranches("active", companyIds);
  const [query, setQuery] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const form = useForm<BranchForm>({ defaultValues: emptyForm() });
  const formCompanyId = form.watch("company_id");
  const createMutation = useCreateBranch(formCompanyId || "");

  const companyNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of companyList) m.set(c.company_id, c.legal_name || c.name);
    return m;
  }, [companyList]);

  const rows = useMemo(() => {
    const list = ((data ?? []) as BranchDto[]).map((b) => ({
      ...b,
      company_name: companyNameById.get(b.company_id) || "—",
    }));
    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) =>
      [r.name, r.code, (r as { company_name?: string }).company_name]
        .map((x) => String(x ?? "").toLowerCase())
        .join(" ")
        .includes(q)
    );
  }, [data, query, companyNameById]);

  function openCreate() {
    form.reset(emptyForm());
    if (companyList[0]) form.setValue("company_id", companyList[0].company_id);
    setSheetOpen(true);
  }

  async function onSubmit(values: BranchForm) {
    try {
      await createMutation.mutateAsync({
        company_id: values.company_id,
        code: values.code.trim(),
        name: values.name.trim(),
        address: values.address.trim() || undefined,
        branch_kind: values.branch_kind,
        is_active: values.is_active,
      });
      toast.success("شعبه ایجاد شد");
      setSheetOpen(false);
      form.reset(emptyForm());
      void refetch();
    } catch (e) {
      toast.error(e instanceof ApiClientError ? e.message : "خطا در ایجاد شعبه");
    }
  }

  if (!canView) {
    return <div className="p-6"><EmptyState title="مجوز مشاهده شعب را ندارید" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="شعب"
        description="فهرست سراسری شعب مستأجر"
        breadcrumbs={[{ label: "سازمان", href: "/dashboard/organization" }, { label: "شعب" }]}
        icon={<GitBranch className="h-4 w-4" />}
        actions={canCreate ? <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" /> شعبه جدید</Button> : null}
      />
      <div className="relative max-w-md">
        <Search className="absolute start-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-9 ps-9" placeholder="جستجو…" value={query} onChange={(e) => setQuery(e.target.value)} />
      </div>
      {isLoading ? (
        <div className="space-y-2"><Skeleton className="h-10 w-full" /><Skeleton className="h-10 w-full" /></div>
      ) : isError ? (
        <EmptyState title="بارگذاری ناموفق" actionLabel="تلاش مجدد" onAction={() => void refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState title="شعبه‌ای یافت نشد" />
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>نام</TableHead>
                <TableHead>کد</TableHead>
                <TableHead>نوع</TableHead>
                <TableHead>وضعیت</TableHead>
                <TableHead>شرکت</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.branch_id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="font-mono text-xs" dir="ltr">{row.code || "—"}</TableCell>
                  <TableCell>{BRANCH_KIND_LABELS?.[row.branch_kind as string] ?? row.branch_kind ?? "—"}</TableCell>
                  <TableCell>
                    <StatusChip tone={row.is_active !== false ? "success" : "neutral"} label={row.is_active !== false ? "فعال" : "غیرفعال"} />
                  </TableCell>
                  <TableCell>
                    <Link href={companyDetailPath(row.company_id)} className="text-sm text-primary hover:underline">
                      {(row as { company_name?: string }).company_name}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <div className="border-t px-3 py-2 text-sm text-muted-foreground">
            {toFaDigits(String(rows.length))} شعبه
            {isFetching ? <Loader2 className="ms-2 inline h-3.5 w-3.5 animate-spin" /> : null}
          </div>
        </div>
      )}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader><SheetTitle>شعبه جدید</SheetTitle></SheetHeader>
          <form className="mt-4 space-y-3" onSubmit={form.handleSubmit(onSubmit)}>
            <div className="space-y-1">
              <Label>شرکت</Label>
              <Select value={form.watch("company_id") || ""} onValueChange={(v) => form.setValue("company_id", v, { shouldDirty: true })}>
                <SelectTrigger><SelectValue placeholder="انتخاب شرکت" /></SelectTrigger>
                <SelectContent>
                  {companyList.map((c) => (
                    <SelectItem key={c.company_id} value={c.company_id}>{c.legal_name || c.name || c.code}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1"><Label>کد</Label><Input {...form.register("code", { required: true })} /></div>
            <div className="space-y-1"><Label>نام</Label><Input {...form.register("name", { required: true })} /></div>
            <div className="space-y-1"><Label>آدرس</Label><Input {...form.register("address")} /></div>
            <div className="space-y-1">
              <Label>نوع</Label>
              <Select value={form.watch("branch_kind") || "OFFICE"} onValueChange={(v) => form.setValue("branch_kind", v, { shouldDirty: true })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BRANCH_KIND_LABELS ?? { OFFICE: "دفتر" }).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.watch("is_active") !== false} onCheckedChange={(c) => form.setValue("is_active", c, { shouldDirty: true })} />
              <Label>فعال</Label>
            </div>
            <SheetFooter>
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>انصراف</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ایجاد"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
