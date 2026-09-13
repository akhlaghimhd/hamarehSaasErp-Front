"use client";

import { useEffect, useMemo, useState } from "react";
import {
  GuidePageHeader,
  GuideRulesBox,
  GuideSection,
} from "@/shared/components/ui-guide/guide-shell";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { cn } from "@/shared/lib/utils";
import {
  ArrowLeft,
  Building2,
  Check,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  GripVertical,
  MessageSquare,
  Send,
  Shield,
  ThumbsDown,
  ThumbsUp,
  User,
} from "lucide-react";

const meta = {
  code: "UI-08",
  title: "Workflow & Process Patterns",
  description:
    "Stepper، Approval، Kanban تعاملی، Timeline غنی (واحد/نقش/وضعیت) و Activity Feed.",
  phase: "فاز ۳",
  status: "ready" as const,
};

function toFa(n: number | string) {
  return String(n).replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)]);
}

const steps = [
  { id: 1, title: "پیش‌نویس", desc: "ثبت اولیه سند" },
  { id: 2, title: "ارسال", desc: "ارسال برای تأیید" },
  { id: 3, title: "تأیید", desc: "تصمیم approver" },
  { id: 4, title: "ثبت نهایی", desc: "اثر حسابداری / انبار" },
];

type ColumnKey = "draft" | "pending" | "approved" | "rejected";

type KanbanCard = {
  id: string;
  title: string;
  meta: string;
  column: ColumnKey;
  unit: string;
  assignee: string;
  role: string;
};

const initialKanban: KanbanCard[] = [
  {
    id: "1",
    title: "PO-1403-018",
    meta: "خرید ورق",
    column: "draft",
    unit: "خرید",
    assignee: "مریم احمدی",
    role: "کارشناس خرید",
  },
  {
    id: "2",
    title: "SO-1403-042",
    meta: "فروش عمده",
    column: "pending",
    unit: "فروش",
    assignee: "علی رضایی",
    role: "مدیر فروش",
  },
  {
    id: "3",
    title: "GR-1403-009",
    meta: "رسید انبار",
    column: "pending",
    unit: "انبار",
    assignee: "حسین کریمی",
    role: "سرپرست انبار",
  },
  {
    id: "4",
    title: "INV-1403-101",
    meta: "فاکتور فروش",
    column: "approved",
    unit: "حسابداری",
    assignee: "نرگس موسوی",
    role: "حسابدار",
  },
  {
    id: "5",
    title: "PR-1403-003",
    meta: "درخواست خرید",
    column: "rejected",
    unit: "خرید",
    assignee: "سارا محمدی",
    role: "کارشناس خرید",
  },
];

const columns: { key: ColumnKey; label: string; tone: string }[] = [
  { key: "draft", label: "پیش‌نویس", tone: "bg-muted/40" },
  { key: "pending", label: "در انتظار تأیید", tone: "bg-amber-500/5" },
  { key: "approved", label: "تأیید شده", tone: "bg-emerald-500/5" },
  { key: "rejected", label: "رد شده", tone: "bg-destructive/5" },
];

const allowedTransitions: Record<ColumnKey, ColumnKey[]> = {
  draft: ["pending", "rejected"],
  pending: ["approved", "rejected", "draft"],
  approved: ["pending"],
  rejected: ["draft", "pending"],
};

type TimelineEvent = {
  at: string;
  date: string;
  actor: string;
  role: string;
  unit: string;
  action: string;
  fromStatus?: string;
  toStatus?: string;
  note?: string;
  tone: "default" | "info" | "warning" | "success" | "danger";
  stepId: number;
};

const timeline: TimelineEvent[] = [
  {
    at: "۱۴:۳۲",
    date: "۱۴۰۳/۰۶/۲۰",
    actor: "سارا محمدی",
    role: "کارشناس فروش",
    unit: "فروش · شعبه مرکزی",
    action: "سند را ایجاد کرد",
    toStatus: "پیش‌نویس",
    tone: "default",
    stepId: 1,
  },
  {
    at: "۱۴:۴۵",
    date: "۱۴۰۳/۰۶/۲۰",
    actor: "سارا محمدی",
    role: "کارشناس فروش",
    unit: "فروش · شعبه مرکزی",
    action: "برای تأیید ارسال کرد",
    fromStatus: "پیش‌نویس",
    toStatus: "در انتظار تأیید",
    tone: "info",
    stepId: 2,
  },
  {
    at: "۱۵:۱۰",
    date: "۱۴۰۳/۰۶/۲۰",
    actor: "علی رضایی",
    role: "مدیر فروش",
    unit: "فروش · ستاد",
    action: "درخواست توضیح روی مبلغ",
    fromStatus: "در انتظار تأیید",
    toStatus: "در انتظار تأیید",
    note: "مبلغ تخفیف خارج از سقف است؛ لطفاً توضیح دهید.",
    tone: "warning",
    stepId: 3,
  },
  {
    at: "۱۵:۴۰",
    date: "۱۴۰۳/۰۶/۲۰",
    actor: "سارا محمدی",
    role: "کارشناس فروش",
    unit: "فروش · شعبه مرکزی",
    action: "توضیح را پاسخ داد",
    note: "تخفیف با تأیید کتبی مدیرعامل است.",
    tone: "info",
    stepId: 3,
  },
  {
    at: "۱۶:۰۵",
    date: "۱۴۰۳/۰۶/۲۰",
    actor: "علی رضایی",
    role: "مدیر فروش",
    unit: "فروش · ستاد",
    action: "سند را تأیید کرد",
    fromStatus: "در انتظار تأیید",
    toStatus: "تأیید شده",
    tone: "success",
    stepId: 3,
  },
  {
    at: "۱۶:۱۲",
    date: "۱۴۰۳/۰۶/۲۰",
    actor: "سیستم",
    role: "Workflow Engine",
    unit: "حسابداری",
    action: "ثبت نهایی و صدور سند حسابداری",
    fromStatus: "تأیید شده",
    toStatus: "ثبت نهایی",
    tone: "success",
    stepId: 4,
  },
];

const statusBadgeVariant: Record<
  string,
  "secondary" | "warning" | "success" | "destructive" | "outline"
> = {
  "پیش‌نویس": "secondary",
  "در انتظار تأیید": "warning",
  "تأیید شده": "success",
  "ثبت نهایی": "success",
  "رد شده": "destructive",
};

export default function WorkflowGuidePage() {
  const [activeStep, setActiveStep] = useState(2);
  const [kanban, setKanban] = useState(initialKanban);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<ColumnKey | null>(null);
  const [moveMsg, setMoveMsg] = useState<string | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const isDirty = useMemo(
    () => note.trim().length > 0 || decision !== null,
    [note, decision]
  );

  const maxTimelineStep = Math.max(...timeline.map((t) => t.stepId));

  useEffect(() => {
    function clearDrag() {
      setDraggingId(null);
      setDropTarget(null);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") clearDrag();
    }
    window.addEventListener("dragend", clearDrag);
    window.addEventListener("mouseup", clearDrag);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("dragend", clearDrag);
      window.removeEventListener("mouseup", clearDrag);
      window.removeEventListener("keydown", onKey);
    };
  }, []);

  function resetApproveForm() {
    setNote("");
    setDecision(null);
  }

  function closeApprove() {
    setApproveOpen(false);
    resetApproveForm();
  }

  function handleApproveSubmit() {
    if (!decision) return;
    setSaving(true);
    window.setTimeout(() => {
      setSaving(false);
      setLastResult(decision === "approve" ? "سند تأیید شد" : "سند رد شد");
      closeApprove();
      setActiveStep(decision === "approve" ? 4 : 1);
      setKanban((prev) =>
        prev.map((c) =>
          c.id === "2"
            ? {
                ...c,
                column: decision === "approve" ? "approved" : "rejected",
              }
            : c
        )
      );
    }, 500);
  }

  function moveCard(cardId: string, to: ColumnKey) {
    const card = kanban.find((c) => c.id === cardId);
    if (!card || card.column === to) return;

    const allowed = allowedTransitions[card.column];
    if (!allowed.includes(to)) {
      setMoveMsg(
        `انتقال از «${columns.find((c) => c.key === card.column)?.label}» به «${columns.find((c) => c.key === to)?.label}» مجاز نیست.`
      );
      window.setTimeout(() => setMoveMsg(null), 2800);
      return;
    }

    setKanban((prev) =>
      prev.map((c) => (c.id === cardId ? { ...c, column: to } : c))
    );
    setMoveMsg(`${card.title} → ${columns.find((c) => c.key === to)?.label}`);
    window.setTimeout(() => setMoveMsg(null), 2200);
  }

  function onDragStart(e: React.DragEvent, id: string) {
    const target = e.target as HTMLElement;
    if (target.closest("button, a, input, textarea, select")) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData("text/plain", id);
    e.dataTransfer.effectAllowed = "move";
    if (e.currentTarget instanceof HTMLElement) {
      e.dataTransfer.setDragImage(e.currentTarget, 20, 20);
    }
    setDraggingId(id);
  }

  function onDragEnd() {
    setDraggingId(null);
    setDropTarget(null);
  }

  function onDragOver(e: React.DragEvent, col: ColumnKey) {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = "move";
    if (dropTarget !== col) setDropTarget(col);
  }

  function onDrop(e: React.DragEvent, col: ColumnKey) {
    e.preventDefault();
    e.stopPropagation();
    const id = e.dataTransfer.getData("text/plain") || draggingId;
    if (id) moveCard(id, col);
    setDraggingId(null);
    setDropTarget(null);
  }

  return (
    <div className="space-y-6" dir="rtl">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="قوانین گردش‌کار و Overlay (از UI-02)">
        <ul className="list-disc space-y-1 pr-5">
          <li>
            وضعیت سند فقط از طریق Workflow تغییر می‌کند · نه دکمهٔ آزاد در UI.
          </li>
          <li>
            Stepper وضعیت فعلی را نشان می‌دهد · مراحل آینده غیرفعال · گذشته قابل مشاهده.
          </li>
          <li>
            تأیید/رد در Modal یا Drawer ·{" "}
            <strong className="text-foreground">
              اگر فرم تغییر کرده فقط ثبت یا انصراف می‌بندد · کلیک بیرون نمی‌بندد
            </strong>
            .
          </li>
          <li>انصراف بدون سؤال · بدون رفرش صفحه بعد از تصمیم.</li>
          <li>
            Timeline: هر رخداد با واحد، نقش، کاربر و وضعیت قبل/بعد · منبع حسابرسی.
          </li>
          <li>
            Kanban: drag فقط روی transition مجاز · کارت با واحد و مسئول.
          </li>
        </ul>
      </GuideRulesBox>

      <GuideSection
        title="۱) Stepper — مراحل گردش سند"
        description="پیش‌نویس → ارسال → تأیید → ثبت نهایی"
      >
        <div className="rounded-xl border border-border/70 bg-card p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            {steps.map((s, i) => {
              const done = s.id < activeStep;
              const current = s.id === activeStep;
              return (
                <div key={s.id} className="flex flex-1 items-start gap-2">
                  <div className="flex flex-col items-center">
                    <div
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-full border text-xs font-medium",
                        done && "border-emerald-500 bg-emerald-500 text-white",
                        current &&
                          "border-primary bg-primary text-primary-foreground",
                        !done &&
                          !current &&
                          "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {done ? <Check className="h-3.5 w-3.5" /> : toFa(s.id)}
                    </div>
                    {i < steps.length - 1 ? (
                      <div
                        className={cn(
                          "mt-1 hidden h-full min-h-[2rem] w-px sm:block",
                          done ? "bg-emerald-500/50" : "bg-border"
                        )}
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0 pb-2">
                    <div
                      className={cn(
                        "text-sm font-medium",
                        current && "text-primary",
                        done && "text-emerald-700 dark:text-emerald-400"
                      )}
                    >
                      {s.title}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {s.desc}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-2 border-t border-border/60 pt-3">
            {steps.map((s) => (
              <Button
                key={s.id}
                size="sm"
                variant={activeStep === s.id ? "default" : "outline"}
                className="h-7 text-[11px]"
                onClick={() => setActiveStep(s.id)}
              >
                مرحله {toFa(s.id)}
              </Button>
            ))}
          </div>
        </div>
      </GuideSection>

      <GuideSection
        title="۲) Approval — تأیید / رد در Modal"
        description="قواعد UI-02: dirty → بیرون نمی‌بندد · فقط ثبت یا انصراف."
      >
        <div className="rounded-xl border border-border/70 bg-card p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">SO-1403-042</span>
            <Badge variant="warning" className="text-[10px]">
              در انتظار تأیید
            </Badge>
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Building2 className="h-3 w-3" />
              فروش
            </Badge>
            <Badge variant="outline" className="gap-1 text-[10px]">
              <User className="h-3 w-3" />
              علی رضایی · مدیر فروش
            </Badge>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            مبلغ:{" "}
            <span dir="ltr" className="font-mono">
              {toFa("12,500,000")}
            </span>{" "}
            ریال · مشتری: شرکت نمونه
          </p>
          <Button size="sm" onClick={() => setApproveOpen(true)}>
            باز کردن پنل تأیید
          </Button>
          {lastResult ? (
            <p className="mt-2 text-xs text-emerald-700 dark:text-emerald-400">
              {lastResult} · بدون رفرش صفحه
            </p>
          ) : null}
        </div>

        <Dialog
          open={approveOpen}
          onOpenChange={(open) => {
            if (open) {
              setApproveOpen(true);
              return;
            }
            if (!isDirty) closeApprove();
          }}
        >
          <DialogContent
            className="sm:max-w-md"
            onPointerDownOutside={(e) => {
              if (isDirty) e.preventDefault();
            }}
            onEscapeKeyDown={(e) => {
              if (isDirty) e.preventDefault();
            }}
            onInteractOutside={(e) => {
              if (isDirty) e.preventDefault();
            }}
          >
            <DialogHeader>
              <DialogTitle>تصمیم روی سند</DialogTitle>
              <DialogDescription>
                {isDirty
                  ? "فرم تغییر کرده — فقط با ثبت یا انصراف بسته می‌شود."
                  : "هنوز تغییری نیست — می‌توانید بیرون کلیک کنید."}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant={decision === "approve" ? "default" : "outline"}
                  className="flex-1 gap-1.5"
                  onClick={() => setDecision("approve")}
                >
                  <ThumbsUp className="h-3.5 w-3.5" />
                  تأیید
                </Button>
                <Button
                  size="sm"
                  variant={decision === "reject" ? "destructive" : "outline"}
                  className="flex-1 gap-1.5"
                  onClick={() => setDecision("reject")}
                >
                  <ThumbsDown className="h-3.5 w-3.5" />
                  رد
                </Button>
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium">یادداشت (اختیاری)</label>
                <textarea
                  className="min-h-[72px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="دلیل یا توضیح…"
                />
              </div>
            </div>
            <DialogFooter>
              <Button
                size="sm"
                variant="outline"
                onClick={closeApprove}
                disabled={saving}
              >
                انصراف
              </Button>
              <Button
                size="sm"
                disabled={!decision || saving}
                onClick={handleApproveSubmit}
              >
                {saving ? "در حال ثبت…" : "ثبت تصمیم"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </GuideSection>

      <GuideSection
        title="۳) Kanban — جابه‌جایی بین ستون‌ها"
        description="کارت را از ناحیهٔ خالی یا آیکون ≡ بکشید · دکمه‌های میانبر جدا کار می‌کنند."
      >
        {moveMsg ? (
          <div className="mb-2 rounded-lg border border-primary/25 bg-primary/5 px-3 py-1.5 text-xs text-primary">
            {moveMsg}
          </div>
        ) : null}

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => {
            const isTarget = dropTarget === col.key && draggingId !== null;
            const cards = kanban.filter((c) => c.column === col.key);
            return (
              <div
                key={col.key}
                className={cn(
                  "rounded-xl border border-border/70 p-2 transition-colors",
                  col.tone,
                  isTarget && "border-primary ring-2 ring-primary/30"
                )}
                onDragOver={(e) => onDragOver(e, col.key)}
                onDragEnter={(e) => {
                  e.preventDefault();
                  setDropTarget(col.key);
                }}
                onDragLeave={(e) => {
                  const related = e.relatedTarget as Node | null;
                  if (related && e.currentTarget.contains(related)) return;
                  setDropTarget((t) => (t === col.key ? null : t));
                }}
                onDrop={(e) => onDrop(e, col.key)}
              >
                <div className="mb-2 flex items-center justify-between px-1">
                  <span className="text-xs font-medium">{col.label}</span>
                  <Badge variant="secondary" className="text-[10px]">
                    {toFa(cards.length)}
                  </Badge>
                </div>
                <div className="min-h-[4.5rem] space-y-2">
                  {cards.map((card) => (
                    <div
                      key={card.id}
                      draggable
                      onDragStart={(e) => onDragStart(e, card.id)}
                      onDragEnd={onDragEnd}
                      className={cn(
                        "rounded-lg border border-border/60 bg-card p-2.5 shadow-sm",
                        draggingId === card.id
                          ? "opacity-40 ring-2 ring-primary/40"
                          : "hover:border-primary/30"
                      )}
                    >
                      <div className="flex items-start gap-1.5">
                        <span
                          aria-hidden
                          title="بکشید"
                          className="mt-0.5 flex h-6 w-5 shrink-0 cursor-grab items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
                        >
                          <GripVertical className="h-3.5 w-3.5 pointer-events-none" />
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="font-mono text-xs text-primary">
                            {card.title}
                          </div>
                          <div className="mt-0.5 text-[11px] text-muted-foreground">
                            {card.meta}
                          </div>
                          <div className="mt-1.5 space-y-0.5 text-[10px] text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Building2 className="h-3 w-3 shrink-0" />
                              {card.unit}
                            </div>
                            <div className="flex items-center gap-1">
                              <User className="h-3 w-3 shrink-0" />
                              {card.assignee}
                            </div>
                            <div className="flex items-center gap-1">
                              <Shield className="h-3 w-3 shrink-0" />
                              {card.role}
                            </div>
                          </div>
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {allowedTransitions[card.column].map((k) => (
                              <button
                                key={k}
                                type="button"
                                draggable={false}
                                className="rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground hover:border-primary hover:bg-primary/5 hover:text-primary"
                                onMouseDown={(e) => e.stopPropagation()}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  moveCard(card.id, k);
                                }}
                              >
                                → {columns.find((c) => c.key === k)?.label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {cards.length === 0 ? (
                    <div className="flex h-16 items-center justify-center rounded-lg border border-dashed border-border/60 text-[11px] text-muted-foreground">
                      {isTarget ? "اینجا رها کنید" : "خالی"}
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          کارت را از ناحیهٔ خالی یا آیکون ≡ بکشید (نه از دکمه‌های میانبر). میانبرها همچنان کار می‌کنند.
        </p>
      </GuideSection>

      <GuideSection
        title="۴) Timeline — گردش‌کار بصری با جزئیات"
        description="خط زمانی مراحل + هر رخداد با واحد، نقش، کاربر و وضعیت قبل/بعد."
      >
        <div className="mb-4 overflow-x-auto rounded-xl border border-border/70 bg-card p-4">
          <div className="mb-3 text-xs font-medium text-muted-foreground">
            مسیر گردش این سند (SO-1403-042)
          </div>
          <div className="flex min-w-[28rem] items-center gap-1">
            {steps.map((s, i) => {
              const reached = s.id <= maxTimelineStep;
              const isCurrent = s.id === maxTimelineStep;
              return (
                <div key={s.id} className="flex flex-1 items-center gap-1">
                  <div className="flex flex-col items-center gap-1">
                    <div
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-full border-2 text-xs font-semibold",
                        reached &&
                          !isCurrent &&
                          "border-emerald-500 bg-emerald-500 text-white",
                        isCurrent &&
                          "border-primary bg-primary text-primary-foreground shadow-md",
                        !reached &&
                          "border-border bg-muted text-muted-foreground"
                      )}
                    >
                      {reached && !isCurrent ? (
                        <Check className="h-4 w-4" />
                      ) : (
                        toFa(s.id)
                      )}
                    </div>
                    <span
                      className={cn(
                        "max-w-[4.5rem] text-center text-[10px] leading-tight",
                        isCurrent && "font-medium text-primary",
                        reached &&
                          !isCurrent &&
                          "text-emerald-700 dark:text-emerald-400"
                      )}
                    >
                      {s.title}
                    </span>
                  </div>
                  {i < steps.length - 1 ? (
                    <div
                      className={cn(
                        "mb-5 h-0.5 flex-1 rounded-full",
                        s.id < maxTimelineStep
                          ? "bg-emerald-500/70"
                          : "bg-border"
                      )}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="relative space-y-0 rounded-xl border border-border/70 bg-card p-4">
          {timeline.map((item, i) => (
            <div key={i} className="relative flex gap-3 pb-6 last:pb-0">
              {i < timeline.length - 1 ? (
                <div className="absolute right-[13px] top-8 bottom-0 w-px bg-border" />
              ) : null}
              <div
                className={cn(
                  "relative z-10 mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border bg-card",
                  item.tone === "success" &&
                    "border-emerald-500 text-emerald-600",
                  item.tone === "warning" && "border-amber-500 text-amber-600",
                  item.tone === "info" && "border-primary text-primary",
                  item.tone === "danger" &&
                    "border-destructive text-destructive",
                  item.tone === "default" &&
                    "border-border text-muted-foreground"
                )}
              >
                {item.tone === "success" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : item.tone === "warning" ? (
                  <MessageSquare className="h-3 w-3" />
                ) : item.tone === "info" ? (
                  <Send className="h-3 w-3" />
                ) : (
                  <Circle className="h-2.5 w-2.5 fill-current" />
                )}
              </div>
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{item.action}</span>
                  <span className="text-[11px] text-muted-foreground">
                    {item.date} · <span dir="ltr">{item.at}</span>
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <User className="h-3 w-3" />
                    {item.actor}
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <Shield className="h-3 w-3" />
                    {item.role}
                  </Badge>
                  <Badge variant="outline" className="gap-1 text-[10px]">
                    <Building2 className="h-3 w-3" />
                    {item.unit}
                  </Badge>
                  <Badge variant="secondary" className="text-[10px]">
                    مرحله {toFa(item.stepId)} ·{" "}
                    {steps.find((s) => s.id === item.stepId)?.title}
                  </Badge>
                </div>
                {(item.fromStatus || item.toStatus) && (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    {item.fromStatus ? (
                      <Badge
                        variant={
                          statusBadgeVariant[item.fromStatus] ?? "outline"
                        }
                        className="text-[10px]"
                      >
                        {item.fromStatus}
                      </Badge>
                    ) : null}
                    {item.fromStatus && item.toStatus ? (
                      <ArrowLeft className="h-3 w-3 text-muted-foreground" />
                    ) : null}
                    {item.toStatus ? (
                      <Badge
                        variant={statusBadgeVariant[item.toStatus] ?? "outline"}
                        className="text-[10px]"
                      >
                        {item.toStatus}
                      </Badge>
                    ) : null}
                  </div>
                )}
                {item.note ? (
                  <p className="rounded-md border border-border/60 bg-muted/30 px-2.5 py-1.5 text-[11px] text-muted-foreground">
                    {item.note}
                  </p>
                ) : null}
              </div>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection
        title="۵) Activity Feed — جریان فشرده"
        description="برای هدر سند یا سایدبار جزئیات."
      >
        <div className="space-y-2 rounded-xl border border-border/70 bg-card p-3">
          {[
            {
              icon: Send,
              text: "ارسال برای تأیید توسط سارا · کارشناس فروش",
              time: "۲ ساعت پیش",
            },
            {
              icon: MessageSquare,
              text: "یادداشت علی (مدیر فروش): مبلغ را بررسی کنید",
              time: "۱ ساعت پیش",
            },
            {
              icon: ThumbsUp,
              text: "تأیید توسط علی رضایی · مدیر فروش",
              time: "۲۰ دقیقه پیش",
            },
            {
              icon: CheckCircle2,
              text: "ثبت نهایی در حسابداری · موتور گردش‌کار",
              time: "۵ دقیقه پیش",
            },
          ].map((a, i) => {
            const Icon = a.icon;
            return (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg px-2 py-1.5 hover:bg-muted/40"
              >
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                  <Icon className="h-3 w-3" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-xs">{a.text}</div>
                  <div className="text-[10px] text-muted-foreground">
                    {a.time}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </GuideSection>

      <GuideSection
        title="۶) My Worklist — کارتابل من"
        description="اسناد منتظر اقدام · با واحد و نقش درخواست‌کننده."
      >
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          {[
            {
              code: "SO-1403-042",
              type: "فاکتور فروش",
              wait: "تأیید",
              since: "۴۵ دقیقه",
              unit: "فروش",
              from: "سارا محمدی",
              role: "کارشناس فروش",
            },
            {
              code: "PO-1403-021",
              type: "سفارش خرید",
              wait: "تأیید",
              since: "۲ ساعت",
              unit: "خرید",
              from: "مریم احمدی",
              role: "کارشناس خرید",
            },
            {
              code: "INV-DOC-008",
              type: "سند انبار",
              wait: "بررسی",
              since: "دیروز",
              unit: "انبار",
              from: "حسین کریمی",
              role: "سرپرست انبار",
            },
          ].map((row) => (
            <div
              key={row.code}
              className="flex flex-wrap items-center gap-2 border-b border-border/50 px-3 py-2.5 last:border-0"
            >
              <span className="font-mono text-xs text-primary">{row.code}</span>
              <span className="text-xs">{row.type}</span>
              <Badge variant="warning" className="text-[10px]">
                {row.wait}
              </Badge>
              <Badge variant="outline" className="gap-1 text-[10px]">
                <Building2 className="h-3 w-3" />
                {row.unit}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                از: {row.from} · {row.role}
              </span>
              <span className="mr-auto inline-flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="h-3 w-3" />
                {row.since}
              </span>
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-[11px]"
                onClick={() => setApproveOpen(true)}
              >
                اقدام
              </Button>
            </div>
          ))}
        </div>
      </GuideSection>

      <GuideSection title="۷) Do / Don’t">
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm">
            <div className="mb-2 font-medium text-emerald-700 dark:text-emerald-400">
              انجام بده
            </div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>تغییر وضعیت فقط از Workflow</li>
              <li>Stepper + Timeline هم‌راستا</li>
              <li>هر رخداد: کاربر · نقش · واحد · وضعیت</li>
              <li>Overlay dirty: فقط ثبت/انصراف (UI-02)</li>
              <li>Kanban با transition مجاز</li>
            </ul>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <div className="mb-2 font-medium text-destructive">انجام نده</div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>Timeline بدون نقش/واحد</li>
              <li>پرش وضعیت خارج از transition</li>
              <li>بستن Modal dirty با کلیک بیرون</li>
              <li>پنهان کردن تاریخچه تصمیم</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/overlays">UI-07 Overlays</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/layout">UI-02 Layout</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide">فهرست راهنما</a>
        </Button>
      </div>
    </div>
  );
}
