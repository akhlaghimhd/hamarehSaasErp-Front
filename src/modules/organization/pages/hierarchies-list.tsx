"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronLeft, Loader2, Plus } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { ApiClientError } from "@/api";
import { hierarchyService } from "../services/org-extended-service";
import { useCompanies } from "../hooks/use-companies";

export function HierarchiesListPage() {
  const qc = useQueryClient();
  const { data: companies } = useCompanies();
  const [open, setOpen] = useState(false);
  const [nodeOpen, setNodeOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeHierarchy, setActiveHierarchy] = useState<string | null>(null);

  const form = useForm({
    defaultValues: { code: "", name: "", purpose: "LEGAL" },
  });
  const nodeForm = useForm({
    defaultValues: {
      entity_type: "COMPANY",
      entity_id: "",
      parent_node_id: "",
    },
  });

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["org", "hierarchies"],
    queryFn: () => hierarchyService.list(),
  });

  const nodes = useQuery({
    queryKey: ["org", "hierarchy-nodes", expandedId],
    queryFn: () => hierarchyService.listNodes(expandedId!),
    enabled: !!expandedId,
  });

  const create = useMutation({
    mutationFn: hierarchyService.create,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "hierarchies"] });
      toast.success("سلسله‌مراتب ثبت شد");
      setOpen(false);
      form.reset({ code: "", name: "", purpose: "LEGAL" });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا"),
  });

  const addNode = useMutation({
    mutationFn: (payload: {
      entity_type: string;
      entity_id: string;
      parent_node_id?: string | null;
    }) => hierarchyService.addNode(activeHierarchy!, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["org", "hierarchy-nodes", activeHierarchy] });
      toast.success("گره افزوده شد");
      setNodeOpen(false);
      nodeForm.reset({ entity_type: "COMPANY", entity_id: "", parent_node_id: "" });
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError && e.message ? e.message : "خطا"),
  });

  const toggle = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="سلسله‌مراتب سازمانی"
        description="درخت‌های LEGAL / MANAGEMENT / TAX — گره و والد"
        breadcrumbs={[
          { label: "سازمان", href: "/dashboard/organization" },
          { label: "سلسله‌مراتب" },
        ]}
        actions={
          <Button size="sm" onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" /> جدید
          </Button>
        }
      />

      {isLoading ? (
        <div className="flex gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
        </div>
      ) : null}
      {isError ? (
        <div className="text-sm text-destructive">
          {error instanceof ApiClientError ? error.message : "خطا"}
          <Button variant="outline" size="sm" className="ms-2" onClick={() => void refetch()}>
            تلاش مجدد
          </Button>
        </div>
      ) : null}

      <ul className="divide-y rounded-xl border">
        {(data ?? []).map((h) => {
          const openRow = expandedId === h.hierarchy_id;
          return (
            <li key={h.hierarchy_id} className="px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  className="flex items-center gap-2 text-start"
                  onClick={() => toggle(h.hierarchy_id)}
                >
                  {openRow ? (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronLeft className="h-4 w-4 text-muted-foreground" />
                  )}
                  <div>
                    <div className="font-medium">{h.name}</div>
                    <div className="text-xs text-muted-foreground">
                      <span className="font-mono" dir="ltr">
                        {h.code}
                      </span>{" "}
                      · {h.purpose}
                    </div>
                  </div>
                </button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setActiveHierarchy(h.hierarchy_id);
                    setExpandedId(h.hierarchy_id);
                    setNodeOpen(true);
                  }}
                >
                  <Plus className="h-3.5 w-3.5" /> گره
                </Button>
              </div>
              {openRow ? (
                <div className="mt-3 ms-6 border-s ps-3">
                  {nodes.isLoading ? (
                    <div className="flex gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" /> گره‌ها…
                    </div>
                  ) : null}
                  <ul className="space-y-1 text-sm">
                    {(nodes.data ?? []).map((n) => (
                      <li key={n.node_id} className="text-muted-foreground">
                        <span className="font-mono text-xs" dir="ltr">
                          {n.entity_type}
                        </span>{" "}
                        {n.entity_id.slice(0, 8)}…
                        {n.parent_node_id ? (
                          <span className="text-[10px]"> · parent</span>
                        ) : (
                          <span className="text-[10px] text-primary"> · root</span>
                        )}
                      </li>
                    ))}
                    {!nodes.isLoading && (nodes.data ?? []).length === 0 ? (
                      <li className="text-xs text-muted-foreground">گره‌ای نیست</li>
                    ) : null}
                  </ul>
                </div>
              ) : null}
            </li>
          );
        })}
        {!isLoading && (data ?? []).length === 0 ? (
          <li className="px-4 py-8 text-center text-sm text-muted-foreground">
            سلسله‌مراتبی ثبت نشده است.
          </li>
        ) : null}
      </ul>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>سلسله‌مراتب جدید</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={form.handleSubmit((v) =>
              create.mutate({
                code: v.code.trim(),
                name: v.name.trim(),
                purpose: v.purpose,
              })
            )}
          >
            <div className="space-y-1.5">
              <Label>کد *</Label>
              <Input dir="ltr" className="h-9" {...form.register("code", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>نام *</Label>
              <Input className="h-9" {...form.register("name", { required: true })} />
            </div>
            <div className="space-y-1.5">
              <Label>هدف</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...form.register("purpose")}
              >
                <option value="LEGAL">LEGAL</option>
                <option value="MANAGEMENT">MANAGEMENT</option>
                <option value="TAX">TAX</option>
                <option value="ESTABLISHMENT">ESTABLISHMENT</option>
                <option value="CUSTOM">CUSTOM</option>
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" size="sm" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={nodeOpen} onOpenChange={setNodeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>افزودن گره</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={nodeForm.handleSubmit((v) =>
              addNode.mutate({
                entity_type: v.entity_type,
                entity_id: v.entity_id,
                parent_node_id: v.parent_node_id || null,
              })
            )}
          >
            <div className="space-y-1.5">
              <Label>نوع</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...nodeForm.register("entity_type")}
              >
                <option value="COMPANY">COMPANY</option>
                <option value="BRANCH">BRANCH</option>
                <option value="BUSINESS_UNIT">BUSINESS_UNIT</option>
                <option value="COST_CENTER">COST_CENTER</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>شرکت (برای COMPANY)</Label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                {...nodeForm.register("entity_id", { required: true })}
              >
                <option value="">—</option>
                {(companies ?? []).map((c) => (
                  <option key={c.company_id} value={c.company_id}>
                    {c.legal_name || c.name}
                  </option>
                ))}
              </select>
            </div>
            <DialogFooter>
              <Button type="submit" size="sm" disabled={addNode.isPending}>
                {addNode.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "ثبت گره"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
