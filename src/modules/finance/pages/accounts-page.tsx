"use client";

import { useMemo, useState } from "react";
import {
  ChevronDown,
  ChevronLeft,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { usePermission } from "@/auth";
import {
  useAccountTree,
  useCreateAccount,
  useDeleteAccount,
} from "../hooks/use-accounts";
import { accountService } from "../services/account-service";
import {
  ACCOUNT_TYPE_LABELS,
  FinancePermissions,
  type AccountTreeNode,
} from "../types";
import { ApiClientError } from "@/api";
import { cn, toFaDigits } from "@/shared/lib/utils";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { financeAccountKeys } from "../hooks/use-accounts";

const TYPE_ORDER = [1, 2, 3, 4, 5] as const;

function groupByType(roots: AccountTreeNode[]): Record<number, AccountTreeNode[]> {
  const map: Record<number, AccountTreeNode[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const n of roots) {
    const t = Number(n.account_type);
    if (map[t]) map[t].push(n);
  }
  return map;
}

type FormMode =
  | { kind: "create-root" }
  | { kind: "create-child"; parent: AccountTreeNode }
  | { kind: "edit"; account: AccountTreeNode };

function TreeRow({
  node,
  depth,
  canCreate,
  canDelete,
  canEdit,
  openIds,
  toggle,
  onAddChild,
  onEdit,
  onDelete,
}: {
  node: AccountTreeNode;
  depth: number;
  canCreate: boolean;
  canDelete: boolean;
  canEdit: boolean;
  openIds: Set<string>;
  toggle: (id: string) => void;
  onAddChild: (node: AccountTreeNode) => void;
  onEdit: (node: AccountTreeNode) => void;
  onDelete: (id: string) => void;
}) {
  const hasKids = Boolean(node.children?.length);
  const open = openIds.has(node.account_id);

  return (
    <div>
      <div
        className="group flex items-center gap-2 border-b border-border/40 py-2 pe-2 text-sm"
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
          <span className="hidden text-[10px] text-emerald-700 dark:text-emerald-400 sm:inline">
            قابل ثبت
          </span>
        ) : (
          <span className="hidden text-[10px] text-muted-foreground sm:inline">کنترل</span>
        )}

        <div className="flex shrink-0 items-center gap-0.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100">
          {canCreate ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="افزودن زیرحساب"
              onClick={() => onAddChild(node)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {canEdit ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title="ویرایش"
              onClick={() => onEdit(node)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {canDelete && node.is_postable ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              title="حذف"
              onClick={() => onDelete(node.account_id)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>

      {hasKids && open
        ? node.children!.map((c) => (
            <TreeRow
              key={c.account_id}
              node={c}
              depth={depth + 1}
              canCreate={canCreate}
              canDelete={canDelete}
              canEdit={canEdit}
              openIds={openIds}
              toggle={toggle}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
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
  const canEdit = usePermission(FinancePermissions.coaUpdate);

  const { data, isLoading, error, refetch } = useAccountTree();
  const createMut = useCreateAccount();
  const deleteMut = useDeleteAccount();
  const qc = useQueryClient();

  const updateMut = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: { account_code: string; name: string };
    }) => accountService.update(id, payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: financeAccountKeys.all });
    },
  });

  const [mode, setMode] = useState<FormMode>({ kind: "create-root" });
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState(1);
  const [formError, setFormError] = useState<string | null>(null);
  const [openTypes, setOpenTypes] = useState<Set<number>>(() => new Set([1]));
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const grouped = useMemo(() => groupByType(data ?? []), [data]);

  function resetForm() {
    setMode({ kind: "create-root" });
    setCode("");
    setName("");
    setType(1);
    setFormError(null);
  }

  function startAddChild(parent: AccountTreeNode) {
    setMode({ kind: "create-child", parent });
    setCode("");
    setName("");
    setType(Number(parent.account_type));
    setFormError(null);
    setOpenTypes((prev) => new Set(prev).add(Number(parent.account_type)));
    setOpenIds((prev) => new Set(prev).add(parent.account_id));
  }

  function startEdit(account: AccountTreeNode) {
    setMode({ kind: "edit", account });
    setCode(account.account_code);
    setName(account.name);
    setType(Number(account.account_type));
    setFormError(null);
  }

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

  async function handleSubmit() {
    setFormError(null);
    try {
      if (mode.kind === "edit") {
        await updateMut.mutateAsync({
          id: mode.account.account_id,
          payload: { account_code: code.trim(), name: name.trim() },
        });
      } else if (mode.kind === "create-child") {
        await createMut.mutateAsync({
          account_code: code.trim(),
          name: name.trim(),
          account_type: Number(mode.parent.account_type),
          parent_account_id: mode.parent.account_id,
          is_postable: true,
          normal_balance:
            Number(mode.parent.account_type) === 4 ||
            Number(mode.parent.account_type) === 2 ||
            Number(mode.parent.account_type) === 3
              ? 2
              : 1,
        });
        setOpenIds((prev) => new Set(prev).add(mode.parent.account_id));
      } else {
        await createMut.mutateAsync({
          account_code: code.trim(),
          name: name.trim(),
          account_type: type,
          parent_account_id: null,
          is_postable: true,
          normal_balance: type === 4 || type === 2 || type === 3 ? 2 : 1,
        });
        setOpenTypes((prev) => new Set(prev).add(type));
      }
      resetForm();
    } catch (e) {
      const msg =
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "خطا در ذخیره";
      setFormError(msg);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("حذف این حساب؟")) return;
    try {
      await deleteMut.mutateAsync(id);
      if (mode.kind === "edit" && mode.account.account_id === id) resetForm();
    } catch (e) {
      alert(e instanceof Error ? e.message : "حذف ممکن نیست");
    }
  }

  if (!canView) {
    return (
      <div className="p-6 text-sm text-amber-700">مجوز مشاهده کدینگ را ندارید.</div>
    );
  }

  const busy = createMut.isPending || updateMut.isPending;
  const formTitle =
    mode.kind === "edit"
      ? "ویرایش حساب"
      : mode.kind === "create-child"
        ? `زیرحساب برای «${mode.parent.name}»`
        : "حساب جدید";

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

      {(canCreate || canEdit) && (
        <div className="rounded-xl border bg-card p-3">
          <div className="mb-2 flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{formTitle}</span>
            {mode.kind !== "create-root" ? (
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                onClick={resetForm}
              >
                <X className="h-3.5 w-3.5" />
                انصراف
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">کد</label>
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-28"
              />
            </div>
            <div className="min-w-[160px] flex-1 space-y-1">
              <label className="text-xs text-muted-foreground">نام</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            {mode.kind === "create-root" ? (
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">نوع</label>
                <select
                  className="h-9 rounded-md border bg-background px-2 text-sm"
                  value={type}
                  onChange={(e) => setType(Number(e.target.value))}
                >
                  {Object.entries(ACCOUNT_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <Button
              size="sm"
              disabled={!code.trim() || !name.trim() || busy}
              onClick={() => void handleSubmit()}
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className={busy ? "ms-1" : ""}>
                {mode.kind === "edit" ? "ذخیره" : "افزودن"}
              </span>
            </Button>
          </div>
          {formError ? (
            <p className="mt-2 text-xs text-destructive">{formError}</p>
          ) : null}
        </div>
      )}

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
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 text-muted-foreground transition-transform",
                      open && "rotate-180"
                    )}
                  />
                </button>
                {open ? (
                  <div className="border-t border-border/50">
                    {roots.map((n) => (
                      <TreeRow
                        key={n.account_id}
                        node={n}
                        depth={0}
                        canCreate={canCreate}
                        canDelete={canDelete}
                        canEdit={canEdit}
                        openIds={openIds}
                        toggle={toggleNode}
                        onAddChild={startAddChild}
                        onEdit={startEdit}
                        onDelete={(id) => void handleDelete(id)}
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
