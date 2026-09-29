"use client";

/**
 * Sales or Purch org detail — assignment management only.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { ApiClientError } from "@/api";
import {
  salesOrgService,
  purchOrgService,
  type OrgAssignmentDto,
} from "../services/org-extended-service";
import { companyService } from "../services/company-service";
import { branchService } from "../services/branch-service";

type Kind = "sales" | "purch";

type ConfirmState = {
  title: string;
  description: string;
  onConfirm: () => void;
} | null;

export function SalesPurchOrgDetailPage({ kind }: { kind: Kind }) {
  const params = useParams();
  const id = String(params?.id ?? "");
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [companyId, setCompanyId] = useState("");
  const [branchId, setBranchId] = useState("");
  const [confirm, setConfirm] = useState<ConfirmState>(null);

  const orgQuery = useQuery({
    queryKey: ["org", kind, id],
    enabled: !!id,
    queryFn: async () => {
      if (kind === "sales") {
        const list = await salesOrgService.list();
        return list.find((x) => x.sales_org_id === id) ?? null;
      }
      const list = await purchOrgService.list();
      return list.find((x) => x.purch_org_id === id) ?? null;
    },
  });

  const assignments = useQuery({
    queryKey: ["org", kind, id, "assignments"],
    enabled: !!id,
    queryFn: () =>
      kind === "sales"
        ? salesOrgService.listAssignments(id)
        : purchOrgService.listAssignments(id),
  });

  const companies = useQuery({
    queryKey: ["org", "companies"],
    queryFn: () => companyService.list(),
  });
  const branches = useQuery({
    queryKey: ["org", "branches"],
    queryFn: () => branchService.listAll(),
  });

  const companyLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of companies.data ?? []) {
      const name = c.name || c.legal_name || "";
      const code = c.code || "";
      if (name && code) m.set(c.company_id, `${name} (${code})`);
      else m.set(c.company_id, name || code || c.company_id);
    }
    return m;
  }, [companies.data]);

  const branchLabel = useMemo(() => {
    const m = new Map<string, string>();
    for (const b of branches.data ?? []) {
      const name = b.name || "";
      const code = b.code || "";
      if (name && code) m.set(b.branch_id, `${name} (${code})`);
      else m.set(b.branch_id, name || code || b.branch_id);
    }
    return m;
  }, [branches.data]);

  const onErr = (e: unknown) =>
    toast.error(
      e instanceof ApiClientError && e.message ? e.message : "خطا در عملیات"
    );

  const assignMut = useMutation({
    mutationFn: async () => {
      const payload = {
        company_id: companyId || null,
        branch_id: branchId || null,
      };
      if (kind === "sales") return salesOrgService.assign(id, payload);
      return purchOrgService.assign(id, payload);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org"] });
      toast.success("تخصیص ثبت شد");
      setOpen(false);
      setCompanyId("");
      setBranchId("");
    },
    onError: onErr,
  });

  const unassignMut = useMutation({
    mutationFn: (assignmentId: string) =>
      kind === "sales"
        ? salesOrgService.unassign(assignmentId)
        : purchOrgService.unassign(assignmentId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org"] });
      toast.success("تخصیص حذف شد");
    },
    onError: onErr,
  });

  const title = kind === "sales" ? "سازمان فروش" : "سازمان خرید";
  const org = orgQuery.data;
  const rows: OrgAssignmentDto[] = assignments.data ?? [];
  const selectCls =
    "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

  return (
    <div className="space-y-5">
      <PageHeader
        title={org ? org.name : title}
        description={
          org
            ? `کد: ${org.code} — مدیریت تخصیص به شرکت / شعبه`
            : "جزئیات و تخصیص"
        }
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          {
            label: "فروش و خرید",
            href: "/dashboard/organization/sales-purch",
          },
          { label: org?.name || "جزئیات" },
        ]}
      />

      {org ? (
        <div className="rounded-xl border border-border/60 bg-muted/20 px-4 py-3 text-sm">
          <span className="font-medium">{org.name}</span>
          <span className="mx-2 text-muted-foreground">·</span>
          <span className="font-mono text-xs" dir="ltr">
            {org.code}
          </span>
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" size="sm" className="h-8 gap-1.5">
          <Link href="/dashboard/organization/sales-purch">
            <ArrowRight className="h-3.5 w-3.5" />
            بازگشت به لیست
          </Link>
        </Button>
        <Button
          size="sm"
          className="h-8 gap-1.5"
          onClick={() => {
            setCompanyId("");
            setBranchId("");
            setOpen(true);
          }}
        >
          <Plus className="h-3.5 w-3.5" />
          تخصیص جدید
        </Button>
      </div>

      {orgQuery.isLoading || assignments.isLoading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          در حال بارگذاری…
        </div>
      ) : !org ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          مورد یافت نشد.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-border/60">
          <table className="w-full min-w-[32rem] border-collapse">
            <thead className="border-b bg-muted/30">
              <tr>
                <th className="px-3 py-2.5 text-start text-xs font-medium text-muted-foreground align-middle">
                  شرکت
                </th>
                <th className="px-3 py-2.5 text-start text-xs font-medium text-muted-foreground align-middle">
                  شعبه
                </th>
                <th className="px-3 py-2.5 text-start text-xs font-medium text-muted-foreground align-middle">
                  وضعیت
                </th>
                <th className="px-3 py-2.5 text-end text-xs font-medium text-muted-foreground align-middle">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4}
                    className="px-4 py-10 text-center text-sm text-muted-foreground align-middle"
                  >
                    هنوز تخصیصی ثبت نشده است.
                  </td>
                </tr>
              ) : (
                rows.map((a) => (
                  <tr key={a.assignment_id} className="hover:bg-muted/20">
                    <td className="px-3 py-2.5 text-sm align-middle">
                      {a.company_id
                        ? companyLabel.get(a.company_id) || a.company_id
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-sm align-middle">
                      {a.branch_id
                        ? branchLabel.get(a.branch_id) || a.branch_id
                        : "—"}
                    </td>
                    <td className="px-3 py-2.5 text-sm align-middle">
                      {a.is_active === false ? "غیرفعال" : "فعال"}
                    </td>
                    <td className="px-3 py-2.5 text-end align-middle">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="h-8 text-destructive"
                        disabled={unassignMut.isPending}
                        onClick={() =>
                          setConfirm({
                            title: "حذف تخصیص",
                            description: "این تخصیص حذف شود؟",
                            onConfirm: () => unassignMut.mutate(a.assignment_id),
                          })
                        }
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>تخصیص به شرکت / شعبه</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label>شرکت</Label>
              <select
                className={selectCls}
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
              >
                <option value="">— بدون شرکت —</option>
                {(companies.data ?? []).map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {(c.name || c.legal_name || "") +
                      (c.code ? ` (${c.code})` : "")}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>شعبه</Label>
              <select
                className={selectCls}
                value={branchId}
                onChange={(e) => setBranchId(e.target.value)}
              >
                <option value="">— بدون شعبه —</option>
                {(branches.data ?? []).map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>
                    {(b.name || "") + (b.code ? ` (${b.code})` : "")}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-muted-foreground">
              حداقل یکی از شرکت یا شعبه باید انتخاب شود.
            </p>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              انصراف
            </Button>
            <Button
              type="button"
              disabled={assignMut.isPending || (!companyId && !branchId)}
              onClick={() => assignMut.mutate()}
            >
              {assignMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : null}
              ذخیره تخصیص
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!confirm} onOpenChange={(v) => !v && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.description}</DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
              انصراف
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => {
                const fn = confirm?.onConfirm;
                setConfirm(null);
                fn?.();
              }}
            >
              تأیید حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
