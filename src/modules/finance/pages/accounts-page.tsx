"use client";

import { useMemo, useState, type ReactNode } from "react";
import {
  ChevronDown,
  ChevronLeft,
  CreditCard,
  Landmark,
  Loader2,
  Pencil,
  PieChart,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  X,
  type LucideIcon,
} from "lucide-react";
import { PageHeader } from "@/shared/components/layout/page-header";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
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

/** ۱ کل · ۲ معین · ۳ تفصیلی */
const MAX_DEPTH = 3;

const LEVEL_LABEL: Record<number, string> = {
  1: "کل",
  2: "معین",
  3: "تفصیلی",
};

const TYPE_CODE_BASE: Record<number, string> = {
  1: "1",
  2: "2",
  3: "3",
  4: "4",
  5: "5",
};

/** آیکن و رنگ ظریف هر نوع — نوار کامل روی کل، نازک‌تر روی فرزندان باز */
const TYPE_VISUAL: Record<
  number,
  {
    icon: LucideIcon;
    frame: string;
    rail: string;
    iconClass: string;
    label: string;
  }
> = {
  1: {
    icon: Landmark,
    frame: "border-s-2 border-s-sky-500/55",
    rail: "border-s border-s-sky-500/30",
    iconClass: "text-sky-600/90 dark:text-sky-400/90",
    label: "دارایی",
  },
  2: {
    icon: CreditCard,
    frame: "border-s-2 border-s-amber-500/55",
    rail: "border-s border-s-amber-500/30",
    iconClass: "text-amber-600/90 dark:text-amber-400/90",
    label: "بدهی",
  },
  3: {
    icon: PieChart,
    frame: "border-s-2 border-s-violet-500/55",
    rail: "border-s border-s-violet-500/30",
    iconClass: "text-violet-600/90 dark:text-violet-400/90",
    label: "حقوق صاحبان سهام",
  },
  4: {
    icon: TrendingUp,
    frame: "border-s-2 border-s-emerald-500/55",
    rail: "border-s border-s-emerald-500/30",
    iconClass: "text-emerald-600/90 dark:text-emerald-400/90",
    label: "درآمد",
  },
  5: {
    icon: TrendingDown,
    frame: "border-s-2 border-s-rose-500/55",
    rail: "border-s border-s-rose-500/30",
    iconClass: "text-rose-600/90 dark:text-rose-400/90",
    label: "هزینه",
  },
};

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

function sortRoots(roots: AccountTreeNode[]): AccountTreeNode[] {
  return [...roots].sort((a, b) => {
    const ta = Number(a.account_type);
    const tb = Number(b.account_type);
    if (ta !== tb) return ta - tb;
    return String(a.account_code).localeCompare(String(b.account_code), undefined, {
      numeric: true,
    });
  });
}

function suggestRootCode(type: number, roots: AccountTreeNode[]): string {
  const used = new Set<string>();
  collectCodes(roots, used);
  return TYPE_CODE_BASE[type] ?? String(type);
}

function suggestChildCode(parent: AccountTreeNode, allRoots: AccountTreeNode[]): string {
  const used = new Set<string>();
  collectCodes(allRoots, used);
  const parentCode = String(parent.account_code).trim();
  let i = 1;
  while (used.has(`${parentCode}${i}`)) i += 1;
  return `${parentCode}${i}`;
}

/** رقم فارسی/عربی → لاتین؛ فقط رقم نگه داشته می‌شود */
function normalizeAccountCode(raw: string): string {
  const map: Record<string, string> = {
    "۰": "0", "۱": "1", "۲": "2", "۳": "3", "۴": "4",
    "۵": "5", "۶": "6", "۷": "7", "۸": "8", "۹": "9",
    "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
    "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9",
  };
  return raw
    .split("")
    .map((ch) => map[ch] ?? ch)
    .join("")
    .replace(/\D/g, "");
}

type FormMode =
  | { kind: "create-root"; type: number }
  | { kind: "create-child"; parent: AccountTreeNode }
  | { kind: "edit"; account: AccountTreeNode };

function InlineForm({
  title,
  code,
  name,
  onCode,
  onName,
  onSubmit,
  onCancel,
  busy,
  error,
  submitLabel,
  codeEditable,
}: {
  title: string;
  code: string;
  name: string;
  onCode: (v: string) => void;
  onName: (v: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
  busy: boolean;
  error: string | null;
  submitLabel: string;
  codeEditable: boolean;
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
          readOnly={!codeEditable}
          onChange={(e) => onCode(normalizeAccountCode(e.target.value))}
          className="h-8 w-28 font-mono text-sm"
          title={codeEditable ? "کد حساب (قابل ویرایش)" : "کد حساب"}
          placeholder="کد"
          inputMode="numeric"
        />
        <Input
          value={name}
          onChange={(e) => onName(e.target.value)}
          className="h-8 min-w-[140px] flex-1 text-sm"
          placeholder="نام حساب"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter" && name.trim() && code.trim()) onSubmit();
            if (e.key === "Escape") onCancel();
          }}
        />
        <Button
          size="sm"
          className="h-8"
          disabled={!name.trim() || !code.trim() || busy}
          onClick={onSubmit}
        >
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
  onDelete: (node: AccountTreeNode) => void;
  formSlot: ReactNode;
}) {
  const hasKids = Boolean(node.children?.length);
  const open = openIds.has(node.account_id);
  const level = nodeDepth(node, roots);
  const isKol = level === 1;
  const canAddChild = canCreate && level < MAX_DEPTH;
  const showDelete = canDelete && !isKol && !hasKids;
  const showFormHere =
    (form?.kind === "create-child" && form.parent.account_id === node.account_id) ||
    (form?.kind === "edit" && form.account.account_id === node.account_id);

  const typeVisual = TYPE_VISUAL[Number(node.account_type)];
  const TypeIcon = typeVisual?.icon;

  return (
    <div className={cn(isKol && "mt-2 first:mt-0")}>
      <div
        className={cn(
          "group flex items-center gap-2 border-b border-border/40 py-2 pe-2 text-sm transition-colors",
          "hover:bg-muted/40",
          isKol && typeVisual?.frame,
          isKol && "bg-muted/15",
          !isKol && typeVisual?.rail
        )}
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

        {isKol && TypeIcon ? (
          <TypeIcon
            className={cn("h-3.5 w-3.5 shrink-0", typeVisual.iconClass)}
            aria-label={typeVisual.label}
          />
        ) : null}

        <span
          className={cn(
            "w-14 shrink-0 font-mono text-xs tabular-nums",
            isKol ? "font-semibold text-foreground" : "font-medium text-foreground/80"
          )}
        >
          {toFaDigits(node.account_code)}
        </span>

        {hasKids ? (
          <button
            type="button"
            className={cn(
              "min-w-0 flex-1 truncate text-start hover:text-foreground",
              isKol && "font-medium"
            )}
            onClick={() => toggle(node.account_id)}
            title={open ? "بستن" : "باز کردن"}
          >
            {node.name}
          </button>
        ) : (
          <span className={cn("min-w-0 flex-1 truncate", isKol && "font-medium")}>{node.name}</span>
        )}

        <span className="hidden text-[10px] text-muted-foreground sm:inline">
          {LEVEL_LABEL[level] ?? ""}
        </span>

        <div className="flex shrink-0 items-center gap-0.5 opacity-70 transition-opacity group-hover:opacity-100">
          {canAddChild ? (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              title={level === 1 ? "افزودن معین" : "افزودن تفصیلی"}
              onClick={() => onAddChild(node)}
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {canEdit ? (
            <Button variant="ghost" size="icon" className="h-7 w-7" title="ویرایش کد و نام" onClick={() => onEdit(node)}>
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          ) : null}
          {showDelete ? (
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" title="حذف" onClick={() => onDelete(node)}>
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
  const [openIds, setOpenIds] = useState<Set<string>>(() => new Set());
  const [deleteTarget, setDeleteTarget] = useState<AccountTreeNode | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const roots = useMemo(() => sortRoots(data ?? []), [data]);

  const missingTypes = useMemo(() => {
    const present = new Set(roots.map((r) => Number(r.account_type)));
    return TYPE_ORDER.filter((t) => !present.has(t));
  }, [roots]);

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
  }

  function startAddChild(parent: AccountTreeNode) {
    const level = nodeDepth(parent, roots);
    if (level >= MAX_DEPTH) {
      alert("بیش از سه سطح (کل / معین / تفصیلی) تعریف نمی‌شود.");
      return;
    }
    setForm({ kind: "create-child", parent });
    setCode(suggestChildCode(parent, roots));
    setName("");
    setFormError(null);
    setOpenIds((prev) => new Set(prev).add(parent.account_id));
  }

  function startEdit(account: AccountTreeNode) {
    setForm({ kind: "edit", account });
    setCode(account.account_code);
    setName(account.name);
    setFormError(null);
  }

  function requestDelete(node: AccountTreeNode) {
    setDeleteError(null);
    setDeleteTarget(node);
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
        const parentLevel = nodeDepth(form.parent, roots);
        const nextLevel = parentLevel + 1;
        const postable = nextLevel >= MAX_DEPTH;
        await createMut.mutateAsync({
          account_code: finalCode,
          name: name.trim(),
          account_type: t,
          parent_account_id: form.parent.account_id,
          is_postable: postable,
          is_control_account: !postable,
          account_level: nextLevel,
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
          is_postable: false,
          is_control_account: true,
          account_level: 1,
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

  async function confirmDelete() {
    if (!deleteTarget) return;
    setDeleteError(null);
    try {
      await deleteMut.mutateAsync(deleteTarget.account_id);
      if (form?.kind === "edit" && form.account.account_id === deleteTarget.account_id) {
        closeForm();
      }
      setDeleteTarget(null);
    } catch (e) {
      const msg =
        e instanceof ApiClientError
          ? e.message
          : e instanceof Error
            ? e.message
            : "حذف ممکن نیست (احتمالاً گردش دارد یا زیرمجموعه دارد).";
      setDeleteError(msg);
    }
  }

  if (!canView) {
    return <div className="p-6 text-sm text-amber-700">مجوز مشاهده کدینگ را ندارید.</div>;
  }

  const busy = createMut.isPending || updateMut.isPending;

  function formTitle(): string {
    if (!form) return "";
    if (form.kind === "edit") return "ویرایش حساب (کد و نام)";
    if (form.kind === "create-child") {
      const pl = nodeDepth(form.parent, roots);
      const next = LEVEL_LABEL[pl + 1] ?? "زیرحساب";
      return `${next} زیر «${form.parent.name}»`;
    }
    return `حساب کل — ${ACCOUNT_TYPE_LABELS[form.type] ?? form.type}`;
  }

  const inlineForm = form ? (
    <InlineForm
      title={formTitle()}
      code={code}
      name={name}
      onCode={setCode}
      onName={setName}
      onSubmit={() => void handleSubmit()}
      onCancel={closeForm}
      busy={busy}
      error={formError}
      submitLabel={form.kind === "edit" ? "ذخیره" : "افزودن"}
      codeEditable
    />
  ) : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="کدینگ حساب‌ها"
        description="کل · معین · تفصیلی"
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
        <div className="overflow-hidden rounded-xl border bg-card">
          {canCreate && missingTypes.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 border-b border-border/40 px-3 py-2">
              <span className="text-xs text-muted-foreground">افزودن حساب کل:</span>
              {missingTypes.map((t) => {
                const vis = TYPE_VISUAL[t];
                const Icon = vis?.icon;
                return (
                  <Button key={t} variant="outline" size="sm" className="h-7 text-xs" onClick={() => startAddRoot(t)}>
                    {Icon ? <Icon className={cn("me-1 h-3 w-3", vis.iconClass)} /> : <Plus className="me-1 h-3 w-3" />}
                    {ACCOUNT_TYPE_LABELS[t] ?? t}
                  </Button>
                );
              })}
            </div>
          ) : null}

          {form?.kind === "create-root" ? inlineForm : null}

          {roots.length === 0 && form?.kind !== "create-root" ? (
            <p className="px-3 py-4 text-sm text-muted-foreground">هنوز حساب کلی تعریف نشده است.</p>
          ) : (
            roots.map((n) => (
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
                onDelete={requestDelete}
                formSlot={inlineForm}
              />
            ))
          )}
        </div>
      )}

      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteTarget(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>حذف حساب</DialogTitle>
            <DialogDescription>
              {deleteTarget ? (
                <>
                  حساب «{deleteTarget.name}» با کد{" "}
                  <span className="font-mono">{toFaDigits(deleteTarget.account_code)}</span>{" "}
                  حذف شود؟ حساب‌هایی که زیرمجموعه یا گردش سند دارند قابل حذف نیستند.
                </>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          {deleteError ? <p className="text-sm text-destructive">{deleteError}</p> : null}
          <DialogFooter>
            <Button
              variant="outline"
              disabled={deleteMut.isPending}
              onClick={() => {
                setDeleteTarget(null);
                setDeleteError(null);
              }}
            >
              انصراف
            </Button>
            <Button variant="destructive" disabled={deleteMut.isPending} onClick={() => void confirmDelete()}>
              {deleteMut.isPending ? <Loader2 className="me-1 h-4 w-4 animate-spin" /> : null}
              حذف
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
