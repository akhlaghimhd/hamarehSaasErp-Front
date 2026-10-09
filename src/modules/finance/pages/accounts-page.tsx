"use client";

import { useMemo, useState, type ReactNode } from "react";
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

/** حداکثر عمق درخت: ۱=کل ، ۲=معین ، ۳=تفصیلی */
const MAX_DEPTH = 3;

const TYPE_CODE_BASE: Record<number, string> = {
  1: "1",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
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

function nodeDepth(node: AccountTreeNode, roots: AccountTreeNode[]): number {
  const level = Number(node.account_level);
  if (level >= 1) return level;

  function find(nodes: AccountTreeNode[], d: number): number | null {
    for (const n of nodes) {
      if (n.account_id === node.account_id) return d;
      if (n.children?.length) {
        const found = find(n.children, d + 1);
        if (found !== null) return found;
      }
    }
    return null;
  }
  return find(roots, 1) ?? 1;
}

function suggestRootCode(type: number, roots: AccountTreeNode[]): string {
  const used = new Set<string>();
  collectCodes(roots, used);
  const sameType = roots.filter((r) => Number(r.account_type) === type);

  if (sameType.length === 0) {
    const base = TYPE_CODE_BASE[type] ?? String(type);
    return used.has(base) ? `${base}1` : base;
  }

  const base = TYPE_CODE_BASE[type] ?? String(type);
  const nums = sameType
    .map((r) => Number(r.account_code))
    .filter((n) => Number.isFinite(n));
  if (nums.some((n) => n >= 1000)) {
    let max = Math.max(...nums);
    let c = max + 100;
    while (used.has(String(c))) c += 100;
    return String(c);
  }
  let i = 1;
  while (used.has(`${base}${i}`)) i += 1;
  return `${base}${i}`;
}

function suggestChildCode(parent: AccountTreeNode, allRoots: AccountTreeNode[]): string {
  const used = new Set<string>();
  collectCodes(allRoots, used);
  const parentCode = String(parent.account_code).trim();
  const siblings = parent.children ?? [];

  if (siblings.length > 0) {
    const nums = siblings
      .map((s) => Number(String(s.account_code).trim()))
      .filter((n) => Number.isFinite(n));
    if (nums.length > 0) {
      let c = Math.max(...nums) + 1;
      while (used.has(String(c))) c += 1;
      return String(c);
    }
    let i = siblings.length + 1;
    while (used.has(`${parentCode}${i}`)) i += 1;
    return `${parentCode}${i}`;
  }

  if (/^\d+$/.test(parentCode)) {
    if (parentCode.length === 1) {
      const cand = `${parentCode}1`;
      if (!used.has(cand)) return cand;
    }
    if (parentCode.length === 2) {
      const cand = `${parentCode}01`;
      if (!used.has(cand)) return cand;
    }
    const asNum = Number(parentCode);
    if (Number.isFinite(asNum)) {
      let c = asNum + 1;
      while (used.has(String(c))) c += 1;
      if (!String(c).startsWith(parentCode) && parentCode.length <= 4) {
        let i = 1;
        const pad = parentCode.length <= 2 ? 2 : 1;
        let cand = parentCode + String(i).padStart(pad, "0");
        while (used.has(cand)) {
          i += 1;
          cand = parentCode + String(i).padStart(pad, "0");
        }
        return cand;
      }
      return String(c);
    }
  }

  let i = 1;
  while (used.has(`${parentCode}${i}`)) i += 1;
  return `${parentCode}${i}`;
}

type FormMode =
  | { kind: "create-root"; type: number }
  | { kind: "create-child"; parent: AccountTreeNode }
  | { kind: "edit"; account: AccountTreeNode };

function InlineForm({
  title,
  code,
  name,
  onName,
  onSubmit,
  onCancel,
  busy,
  error,
  submitLabel,
}: {
  title: string;
  code: string;
  name: string;
  onName: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
  submitLabel: string;
}) {
  return (
    <div className="border-b border-border/50 bg-muted/30 px-3 py-2">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="text-xs font-medium text-muted-foreground">{title}</span>
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground"
          onClick={onCancel}
          title="انصراف"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={toFaDigits(code)}
          readOnly
          className="h-8 w-24 font-mono text-sm"
          title="کد خودکار بر اساس محل درج در درخت"
        />
        <Input
          value={name}
          onChange={(e) => onName(e.target.value)}
          className="h-8 min-w-[140px] flex-1 text-sm"
          placeholder="نام حساب"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim()) onSubmit();
            if (e.key === "Escape") onCancel();
          }}
        />
        <Button size="sm" className="h-8" disabled={!name.trim() || busy} onClick={onSubmit}>
          {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
          <span className={busy ? "ms-1" : ""}>{submitLabel}</span>
        </Button>
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

function TreeRow({
  node,
  depth,
  roots,
  canCreate,
  canDelete,
  canEdit,
  openIds,
  toggle,
  form,
  onAddChild,
  onEdit,
  onDelete,
  formSlot,
}: {
  node: AccountTreeNode;
  depth: number;
  roots: AccountTreeNode[];
  canCreate: boolean;
  canDelete: boolean;
  canEdit: boolean;
  openIds: Set<string>;
  toggle: (id: string) => void;
  form: FormMode | null;
  onAddChild: (node: AccountTreeNode) => void;
  onEdit: (node: AccountTreeNode) => void;
  onDelete: (id: string) => void;
  formSlot: ReactNode;
}) {
  const hasKids = Boolean(node.children?.length);
  const open = openIds.has(node.account_id);
  const level = nodeDepth(node, roots);
  const canAddChild = canCreate && level < MAX_DEPTH;
  const showFormHere =
    (form?.kind === "create-child" && form.parent.account_id === node.account_id) ||
    (form?.kind === "edit" && form.account.account_id === node.account_id);

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

        <div className="flex shrink-0 items-center gap-0.5">
          {canAddChild ? (
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

      {showFormHere ? formSlot : null}

      {hasKids && open
        ? node.children!.map((c) => (
            <TreeRow
              key={c.account_id}
              node={c}
              depth={depth + 1}
              roots={roots}
              canCreate={canCreate}
              canDelete={canDelete}
              canEdit={canEdit}
              openIds={openIds}
              toggle={toggle}
              form={form}
              onAddChild={onAddChild}
              onEdit={onEdit}
              onDelete={onDelete}
              formSlot={formSlot}
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

  const [form, setForm] = useState<FormMode | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [openTypes, setOpenTypes] = useState<Set<number>>(() => new Set(TYPE_ORDER));
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());

  const roots = data ?? [];
  const grouped = useMemo(() => groupByType(roots), [roots]);

  function closeForm() {
    setForm(null);
    setCode("");
    setName("");
    setFormError(null);
  }

  function startAddRoot(type: number) {
    setForm({ kind: "create-root", type });
    setCode(suggestRootCode(type, roots));
    setName("");
    setFormError(null);
    setOpenTypes((prev) => new Set(prev).add(type));
  }

  function startAddChild(parent: AccountTreeNode) {
    const level = nodeDepth(parent, roots);
    if (level >= MAX_DEPTH) {
      alert(`حداکثر عمق درخت ${toFaDigits(MAX_DEPTH)} سطح است.`);
      return;
    }
    setForm({ kind: "create-child", parent });
    setCode(suggestChildCode(parent, roots));
    setName("");
    setFormError(null);
    setOpenTypes((prev) => new Set(prev).add(Number(parent.account_type)));
    setOpenIds((prev) => new Set(prev).add(parent.account_id));
  }

  function startEdit(account: AccountTreeNode) {
    setForm({ kind: "edit", account });
    setCode(account.account_code);
    setName(account.name);
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
    if (!form) return;
    setFormError(null);
    try {
      const finalCode = code.trim();
      if (!finalCode) {
        setFormError("کد حساب الزامی است.");
        return;
      }
      if (!name.trim()) {
        setFormError("نام حساب الزامی است.");
        return;
      }

      if (form.kind === "edit") {
        await updateMut.mutateAsync({
          id: form.account.account_id,
          payload: { account_code: finalCode, name: name.trim() },
        });
      } else if (form.kind === "create-child") {
        const t = Number(form.parent.account_type);
        await createMut.mutateAsync({
          account_code: finalCode,
          name: name.trim(),
          account_type: t,
          parent_account_id: form.parent.account_id,
          is_postable: true,
          normal_balance: t === 4 || t === 2 || t === 3 ? 2 : 1,
        });
        setOpenIds((prev) => new Set(prev).add(form.parent.account_id));
      } else {
        const t = form.type;
        await createMut.mutateAsync({
          account_code: finalCode,
          name: name.trim(),
          account_type: t,
          parent_account_id: null,
          is_postable: true,
          normal_balance: t === 4 || t === 2 || t === 3 ? 2 : 1,
        });
      }
      closeForm();
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
      if (form?.kind === "edit" && form.account.account_id === id) closeForm();
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

  const inlineForm = form ? (
    <InlineForm
      title={
        form.kind === "edit"
          ? "ویرایش حساب"
          : form.kind === "create-child"
            ? `زیرحساب «${form.parent.name}»`
            : `حساب جدید — ${ACCOUNT_TYPE_LABELS[form.type] ?? form.type}`
      }
      code={code}
      name={name}
      onName={setName}
      onSubmit={() => void handleSubmit()}
      onCancel={closeForm}
      busy={busy}
      error={formError}
      submitLabel={form.kind === "edit" ? "ذخیره" : "افزودن"}
    />
  ) : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="کدینگ حساب‌ها"
        description={`درخت حساب‌های دفتر کل — حداکثر ${toFaDigits(MAX_DEPTH)} سطح`}
        breadcrumbs={[
          { label: "داشبورد", href: "/dashboard" },
          { label: "حسابداری", href: "/dashboard/finance" },
          { label: "کدینگ" },
        ]}
      />

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
      ) : (
        <div className="space-y-2">
          {TYPE_ORDER.map((t) => {
            const list = grouped[t] ?? [];
            const open = openTypes.has(t);
            const showRootForm = form?.kind === "create-root" && form.type === t;

            return (
              <div key={t} className="overflow-hidden rounded-xl border bg-card">
                <div className="flex items-center gap-1 border-b border-border/40 px-2 py-1.5">
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center justify-between gap-2 rounded-md px-1 py-1 text-sm font-medium hover:bg-muted/40"
                    onClick={() => toggleType(t)}
                  >
                    <span>{ACCOUNT_TYPE_LABELS[t] ?? t}</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                        open && "rotate-180"
                      )}
                    />
                  </button>
                  {canCreate ? (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0"
                      title="افزودن حساب در این گروه"
                      onClick={() => startAddRoot(t)}
                    >
                      <Plus className="h-3.5 w-3.5" />
                    </Button>
                  ) : null}
                </div>

                {open ? (
                  <div>
                    {showRootForm ? inlineForm : null}

                    {list.length === 0 && !showRootForm ? (
                      <p className="px-3 py-3 text-xs text-muted-foreground">
                        حسابی در این گروه نیست. با + اضافه کنید.
                      </p>
                    ) : (
                      list.map((n) => (
                        <TreeRow
                          key={n.account_id}
                          node={n}
                          depth={0}
                          roots={roots}
                          canCreate={canCreate}
                          canDelete={canDelete}
                          canEdit={canEdit}
                          openIds={openIds}
                          toggle={toggleNode}
                          form={form}
                          onAddChild={startAddChild}
                          onEdit={startEdit}
                          onDelete={(id) => void handleDelete(id)}
                          formSlot={inlineForm}
                        />
                      ))
                    )}
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
