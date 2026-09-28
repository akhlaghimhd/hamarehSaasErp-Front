"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { ApiClientError } from "@/api";
import {
  salesOrgService,
  purchOrgService,
} from "../services/org-extended-service";
import { companyService } from "../services/company-service";
import { branchService } from "../services/branch-service";

type Kind = "sales" | "purch";

type Props = {
  kind: Kind;
  orgId: string;
  orgLabel: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const selectCls =
  "flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm";

export function SalesPurchAssignDialog({
  kind,
  orgId,
  orgLabel,
  open,
  onOpenChange,
}: Props) {
  const qc = useQueryClient();
  const form = useForm({ defaultValues: { company_id: "", branch_id: "" } });

  const companies = useQuery({
    queryKey: ["org", "companies", "assign"],
    queryFn: () => companyService.list("active"),
    enabled: open,
  });

  const companyId = form.watch("company_id");

  const branches = useQuery({
    queryKey: ["org", "branches", "assign", companyId],
    queryFn: () =>
      companyId
        ? branchService.listByCompany(companyId, "active")
        : branchService.listAll("active"),
    enabled: open,
  });

  const assignments = useQuery({
    queryKey: ["org", kind, "assignments", orgId],
    queryFn: () =>
      kind === "sales"
        ? salesOrgService.listAssignments(orgId)
        : purchOrgService.listAssignments(orgId),
    enabled: open && !!orgId,
  });

  const onErr = (e: unknown) =>
    toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا");

  const inv = () => {
    void qc.invalidateQueries({ queryKey: ["org", kind, "assignments", orgId] });
    void qc.invalidateQueries({ queryKey: ["org", "sales-orgs"] });
    void qc.invalidateQueries({ queryKey: ["org", "purch-orgs"] });
  };

  const assignMut = useMutation({
    mutationFn: (p: { company_id?: string | null; branch_id?: string | null }) =>
      kind === "sales"
        ? salesOrgService.assign(orgId, p)
        : purchOrgService.assign(orgId, p),
    onSuccess: () => {
      inv();
      toast.success("تخصیص ثبت شد");
      form.reset();
    },
    onError: onErr,
  });

  const unassignMut = useMutation({
    mutationFn: (assignmentId: string) =>
      kind === "sales"
        ? salesOrgService.unassign(assignmentId)
        : purchOrgService.unassign(assignmentId),
    onSuccess: () => {
      inv();
      toast.success("تخصیص حذف شد");
    },
    onError: onErr,
  });

  const companyName = (id?: string | null) =>
    (companies.data ?? []).find((c) => c.company_id === id)?.name || id || "—";
  const branchName = (id?: string | null) =>
    (branches.data ?? []).find((b) => b.branch_id === id)?.name || id || "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>تخصیص به شرکت / شعبه</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">{orgLabel}</p>

        <ul className="max-h-40 space-y-1 overflow-y-auto rounded-md border p-2 text-xs">
          {(assignments.data ?? []).map((a) => (
            <li
              key={a.assignment_id}
              className="flex items-center justify-between gap-2 py-1"
            >
              <span>
                {companyName(a.company_id)}
                {a.branch_id ? ` / ${branchName(a.branch_id)}` : ""}
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 text-destructive"
                onClick={() =>
                  confirm("حذف تخصیص؟") && unassignMut.mutate(a.assignment_id)
                }
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </li>
          ))}
          {!assignments.isLoading && !(assignments.data ?? []).length && (
            <li className="py-2 text-center text-muted-foreground">بدون تخصیص</li>
          )}
        </ul>

        <form
          className="space-y-3 border-t pt-3"
          onSubmit={form.handleSubmit((v) => {
            const company_id = v.company_id.trim() || null;
            const branch_id = v.branch_id.trim() || null;
            if (!company_id && !branch_id) {
              toast.error("حداقل شرکت یا شعبه را انتخاب کنید");
              return;
            }
            assignMut.mutate({ company_id, branch_id });
          })}
        >
          <div className="space-y-1.5">
            <Label>شرکت</Label>
            <select className={selectCls} {...form.register("company_id")}>
              <option value="">—</option>
              {(companies.data ?? []).map((c) => (
                <option key={c.company_id} value={c.company_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>شعبه</Label>
            <select className={selectCls} {...form.register("branch_id")}>
              <option value="">—</option>
              {(branches.data ?? []).map((b) => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.name}
                  {b.code ? ` (${b.code})` : ""}
                </option>
              ))}
            </select>
          </div>
          <DialogFooter>
            <Button type="submit" size="sm" disabled={assignMut.isPending}>
              {assignMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "افزودن تخصیص"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
