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
  financeAccountKeys,
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

const TYPE_ORDER = [1, 2, 3, 4, 5] as const;

/** پایه کد برای هر نوع حساب (حساب ریشه) */
const TYPE_CODE_BASE: Record<number, number> = {
  1: 1000,
  2: 2000,
  3: 3000,
  4: 4000,
  5: 5000,
};

function groupByType(roots: AccountTreeNode[]): Record<number, AccountTreeNode[]> {
  const map: Record<number, AccountTreeNode[]> = { 1: [], 2: [], 3: [], 4: [], 5: [] };
  for (const n of roots) {
    const t = Number(n.account_type);
    if (map[t]) map[t].push(n);
  }
  return map;
}

function collectCodes(nodes: AccountTreeNode[], set: Set<string>) {
  for (const n of nodes) {
    set.add(String(n.account_code).trim());
    if (n.children?.length) collectCodes(n.children, set);
  }
}

function parseCodeNum(code: string): number | null {
  const n = Number(String(code).trim());
  return Number.isFinite(n) ? n : null;
}

/** پیشنهاد کد حساب ریشه بر اساس نوع */
function suggestRootCode(type: number, roots: AccountTreeNode[]): string {
  const used = new Set<string>();
  collectCodes(roots, used);

  const sameType = roots.filter((r) => Number(r.account_type) === type);
  let max = (TYPE_CODE_BASE[type] ?? 1000) - 100;

  for (const r of sameType) {
    const n = parseCodeNum(r.account_code);
    if (n !== null && n > max) max = n;
  }

  // گام ۱۰۰ برای ریشه تا جا برای زیرحساب بماند
  let candidate = max < (TYPE_CODE_BASE[type] ?? 1000) ? (TYPE_CODE_BASE[type] ?? 1000) : max + 100;
  while (used.has(String(candidate))) candidate += 100;
  return String(candidate);
}

/** پیشنهاد کد زیرحساب بر اساس والد و خواهر/برادرها */
function suggestChildCode(parent: AccountTreeNode, allRoots: AccountTreeNode[]): string {
  const used = new Set<string>();
  collectCodes(allRoots, used);

  const siblings = parent.children ?? [];
  const parentNum = parseCodeNum(parent.account_code);
  const parentCode = String(parent.account_code).trim();

  if (siblings.length === 0) {
    // اولین فرزند: parent + 01 یا parentNum+1
    if (parentNum !== null) {
      let c = parentNum + 1;
      // اگر parent مثل 1100 باشد، 1101 منطقی‌تر است
      if (parentCode.endsWith("00") || parentCode.endsWith("0")) {
        c = parentNum + 1;
      }
      while (used.has(String(c))) c += 1;
      return String(c);
    }
    const fallback = `${parentCode}01`;
    if (!used.has(fallback)) return fallback;
    let i = 2;
    while (used.has(`${parentCode}${String(i).padStart(2, "0")}`)) i += 1;
    return `${parentCode}${String(i).padStart(2, "0")}`;
  }

  // بیشینه عددی بین خواهر/برادرها
  let max = parentNum ?? 0;
  for (const s of siblings) {
    const n = parseCodeNum(s.account_code);
    if (n !== null && n > max) max = n;
  }
  let candidate = max + 1;
  while (used.has(String(candidate))) candidate += 1;
  return String(candidate);
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
  /** آیا کاربر کد را دستی عوض کرده تا با تغییر نوع دوباره بازنویسی نشود */
  const [codeTouched, setCodeTouched] = useState(false);

  const roots = data ?? [];
  const grouped = useMemo(() => groupByType(roots), [roots]);

  function resetForm() {
    setMode({ kind: "create-root" });
    setName("");
    setType(1);
    setFormError(null);
    setCodeTouched(false);
    setCode(suggestRootCode(1, roots));
  }

  function startAddChild(parent: AccountTreeNode) {
    setMode({ kind: "create-child", parent });
    setName("");
    setType(Number(parent.account_type));
    setFormError(null);
    setCodeTouched(false);
    setCode(suggestChildCode(parent, roots));
    setOpenTypes((prev) => new Set(prev).add(Number(parent.account_type)));
    setOpenIds((prev) => new Set(prev).add(parent.account_id));
  }

  function startEdit(account: AccountTreeNode) {
    setMode({ kind: "edit", account });
    setCode(account.account_code);
    setName(account.name);
    setType(Number(account.account_type));
    setFormError(null);
    setCodeTouched(true);
  }

  function onTypeChange(next: number) {
    setType(next);
    if (mode.kind === "create-root" && !codeTouched) {
      setCode(suggestRootCode(next, roots));
    }
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
      let finalCode = code.trim();
      if (mode.kind !== "edit" && !finalCode) {
        finalCode =
          mode.kind === "create-child"
            ? suggestChildCode(mode.parent, roots)
            : suggestRootCode(type, roots);
      }
      if (!finalCode) {
        setFormError("کد حساب الزامی است.");
        return;
      }

      if (mode.kind === "edit") {
        await updateMut.mutateAsync({
          id: mode.account.account_id,
          payload: { account_code: finalCode, name: name.trim() },
        });
      } else if (mode.kind === "create-child") {
        const t = Number(mode.parent.account_type);
        await createMut.mutateAsync({
          account_code: finalCode,
          name: name.trim(),
          account_type: t,
          parent_account_id: mode.parent.account_id,
          is_postable: true,
          normal_balance: t === 4 || t === 2 || t === 3 ? 2 : 1,
        });
        setOpenIds((prev) => new Set(prev).add(mode.parent.account_id));
      } else {
        await createMut.mutateAsync({
          account_code: finalCode,
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

  // پر کردن اولیه کد ریشه وقتی داده لود شد و فرم خالی است
  const suggestedPreview =
    mode.kind === "create-root"
      ? suggestRootCode(type, roots)
      : mode.kind === "create-child"
        ? suggestChildCode(mode.parent, roots)
        : "";

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
                value={code || (mode.kind !== "edit" ? suggestedPreview : "")}
                onChange={(e) => {
                  setCodeTouched(true);
                  setCode(e.target.value);
                }}
                className="w-28 font-mono"
                placeholder={mode.kind !== "edit" ? toFaDigits(suggestedPreview) : ""}
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
                  onChange={(e) => onTypeChange(Number(e.target.value))}
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
              disabled={!name.trim() || busy}
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
            const list = grouped[t] ?? [];
            if (list.length === 0) return null;
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
                    {list.map((n) => (
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
