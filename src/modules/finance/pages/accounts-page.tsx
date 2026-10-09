"use client";

import { useMemo, useState } from "react";
import { ChevronDown, ChevronLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { usePermission } from "@/auth";
import {
  useAccountTree,
  useCreateAccount,
  useDeleteAccount,
} from "../hooks/use-accounts";
import {
  ACCOUNT_TYPE_LABELS,
  FinancePermissions,
  type AccountTreeNode,
} from "../types";
import { ApiClientError } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";

const TYPE_ORDER = [1, 2, 3, 4, 5] as const;

function groupByType(roots: AccountTreeNode[]): Record<number, AccountTreeNode[]> {
  const map: Record<number, AccountTreeNode[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const n of roots) {
    const t = Number(n.account_type);
    if (map[t]) map[t].push(n);
  }
  return map;
}

/** لیست تخت برای انتخاب والد (با تورفتگی متنی) */
function flattenForParent(
  nodes: AccountTreeNode[],
  depth = 0
): Array<{ id: string; label: string; type: number }> {
  const out: Array<{ id: string; label: string; type: number }> = [];
  for (const n of nodes) {
    const pad = depth > 0 ? `${"— ".repeat(depth)}` : "";
    out.push({
      id: n.account_id,
      label: `${pad}${toFaDigits(n.account_code)} — ${n.name}`,
      type: Number(n.account_type),
    });
    if (n.children?.length) {
      out.push(...flattenForParent(n.children, depth + 1));
    }
  }
  return out;
}

function TreeRow({
  node,
  depth,
  canDelete,
  onDelete,
  openIds,
  toggle,
}: {
  node: AccountTreeNode;
  depth: number;
  canDelete: boolean;
  onDelete: (id: string) => void;
  openIds: Set<string>;
  toggle: (id: string) => void;
}) {
  const hasKids = Boolean(node.children?.length);
  const open = openIds.has(node.account_id);

  return (
    <div>
      <div
        className="flex items-center gap-2 border-b border-border/40 py-2 pe-3 text-sm"
        style={{ paddingInlineStart: 12 + depth * 16 }}
      >
        {hasKids ? (
          <button
            type="button"
            className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground"
            onClick={() => toggle(node.account_id)}
          >
            {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronLeft className="h-3.5 w-3.5" />}
          </button>
        ) : (
          <span className="inline-block h-5 w-5 shrink-0" />
        )}

        <span className="w-14 shrink-0 font-mono text-xs text-muted-foreground">
          {toFaDigits(node.account_code)}
        </span>

        <span className="min-w-0 flex-1 truncate">{node.name}</span>

        {node.is_postable ? (
          <span className="text-[10px] text-emerald-700 dark:text-emerald-400">قابل ثبت</span>
        ) : (
          <span className="text-[10px] text-muted-foreground">کنترل</span>
        )}

        {canDelete && node.is_postable ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-destructive"
            title="حذف نرم"
            onClick={() => onDelete(node.account_id)}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        ) : null}
      </div>

      {hasKids && open
        ? node.children!.map((c) => (
            <TreeRow
              key={c.account_id}
              node={c}
              depth={depth + 1}
              canDelete={canDelete}
              onDelete={onDelete}
              openIds={openIds}
              toggle={toggle}
            />
          ))
        : null}
    </div>
  );
}

export function AccountsPage() {
  const canView = usePermission(FinancePermissions.coaView);
  const canCreate = usePermission(FinancePermissions.coaCreate);
  const canDelete = usePermission(FinancePermissions.coaDelete);

  const { data, isLoading, error, refetch } = useAccountTree();
  const createMut = useCreateAccount();
  const deleteMut = useDeleteAccount();

  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState(1);
  const [parentId, setParentId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [openTypes, setOpenTypes] = useState<Set<number>>(() => new Set([1]));
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const grouped = useMemo(() => groupByType(data ?? []), [data]);
  const parentOptions = useMemo(() => flattenForParent(data ?? []), [data]);

  function toggleType(t: number) {
    setOpenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  }

  function toggleNode(id: string) {
    setOpenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function onParentChange(value: string) {
    setParentId(value);
    if (!value) return;
    const parent = parentOptions.find((p) => p.id === value);
    if (parent) setType(parent.type);
  }

  async function handleCreate() {
    setFormError(null);
    try {
      await createMut.mutateAsync({
        account_code: code.trim(),
        name: name.trim(),
        account_type: type,
        parent_account_id: parentId || null,
        is_postable: true,
        normal_balance: type === 4 || type === 2 || type === 3 ? 2 : 1,
      });
      setCode("");
      setName("");
      setParentId("");
      setOpenTypes((prev) => new Set(prev).add(type));
      if (parentId) {
        setOpenIds((prev) => new Set(prev).add(parentId));
      }
    } catch (e) {
      const msg =
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "خطا در ایجاد حساب";
      setFormError(msg);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("حذف نرم این حساب؟")) return;
    try {
      await deleteMut.mutateAsync(id);
    } catch (e) {
      alert(e instanceof Error ? e.message : "حذف ممکن نیست");
    }
  }

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده کدینگ را ندارید.</div>
    );
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="کدینگ حساب‌ها"
        description="درخت حساب‌های دفتر کل"
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "کدینگ" },
        ]}
      />

      {canCreate ? (
        <div className="flex flex-wrap items-end gap-2 rounded-xl border bg-card p-3">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">کد</label>
            <Input value={code} onChange={(e) => setCode(e.target.value)} className="w-28" />
          </div>
          <div className="min-w-[140px] flex-1 space-y-1">
            <label className="text-xs text-muted-foreground">نام</label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">حساب والد</label>
            <select
              className="h-9 min-w-[180px] max-w-[260px] rounded-md border bg-background px-2 text-sm"
              value={parentId}
              onChange={(e) => onParentChange(e.target.value)}
            >
              <option value="">بدون والد (حساب اصلی)</option>
              {parentOptions.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">نوع</label>
            <select
              className="h-9 rounded-md border bg-background px-2 text-sm"
              value={type}
              onChange={(e) => setType(Number(e.target.value))}
              disabled={Boolean(parentId)}
            >
              {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <Button
            size="sm"
            disabled={!code.trim() || !name.trim() || createMut.isPending}
            onClick={() => void handleCreate()}
          >
            {createMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            <span className="ms-1">افزودن</span>
          </Button>
          {formError ? <p className="w-full text-xs text-destructive">{formError}</p> : null}
        </div>
      ) : null}

      {isLoading ? (
        <div className="flex items-center gap-2 rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> بارگذاری…
        </div>
      ) : error ? (
        <div className="rounded-xl border bg-card p-4 text-sm text-destructive">
          خطا در بارگذاری.{" "}
          <button type="button" className="underline" onClick={() => void refetch()}>
            تلاش مجدد
          </button>
        </div>
      ) : !data || data.length === 0 ? (
        <div className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">
          حسابی ثبت نشده. سیدر DemoFinanceCoaSeeder را اجرا کنید.
        </div>
      ) : (
        <div className="space-y-2">
          {TYPE_ORDER.map((t) => {
            const roots = grouped[t] ?? [];
            if (roots.length === 0) return null;
            const open = openTypes.has(t);
            return (
              <div key={t} className="overflow-hidden rounded-xl border bg-card">
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium hover:bg-muted/40"
                  onClick={() => toggleType(t)}
                >
                  <span>{ACCOUNT_TYPE_LABELS[t] ?? t}</span>
                  <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", open && "rotate-180")} />
                </button>
                {open ? (
                  <div className="border-t border-border/50">
                    {roots.map((n) => (
                      <TreeRow
                        key={n.account_id}
                        node={n}
                        depth={0}
                        canDelete={canDelete}
                        onDelete={(id) => void handleDelete(id)}
                        openIds={openIds}
                        toggle={toggleNode}
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
