"use client";

import { useMemo, useState } from "react";
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
  Check,
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  MessageSquare,
  Send,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";

const meta = {
  code: "UI-08",
  title: "Workflow & Process Patterns",
  description:
    "Stepper، Approval، Kanban، Timeline و Activity Feed — با رعایت قواعد Overlay از UI-02.",
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

type KanbanCard = {
  id: string;
  title: string;
  meta: string;
  column: "draft" | "pending" | "approved" | "rejected";
};

const initialKanban: KanbanCard[] = [
  { id: "1", title: "PO-1403-018", meta: "خرید ورق", column: "draft" },
  { id: "2", title: "SO-1403-042", meta: "فروش عمده", column: "pending" },
  { id: "3", title: "GR-1403-009", meta: "رسید انبار", column: "pending" },
  { id: "4", title: "INV-1403-101", meta: "فاکتور فروش", column: "approved" },
  { id: "5", title: "PR-1403-003", meta: "درخواست خرید", column: "rejected" },
];

const columns: { key: KanbanCard["column"]; label: string; tone: string }[] = [
  { key: "draft", label: "پیش‌نویس", tone: "bg-muted/40" },
  { key: "pending", label: "در انتظار تأیید", tone: "bg-amber-500/5" },
  { key: "approved", label: "تأیید شده", tone: "bg-emerald-500/5" },
  { key: "rejected", label: "رد شده", tone: "bg-destructive/5" },
];

const timeline = [
  {
    at: "۱۴:۳۲",
    actor: "سارا محمدی",
    action: "سند را ایجاد کرد",
    tone: "default" as const,
  },
  {
    at: "۱۴:۴۵",
    actor: "سارا محمدی",
    action: "برای تأیید ارسال کرد",
    tone: "info" as const,
  },
  {
    at: "۱۵:۱۰",
    actor: "علی رضایی",
    action: "درخواست توضیح روی مبلغ",
    tone: "warning" as const,
  },
  {
    at: "۱۵:۴۰",
    actor: "سارا محمدی",
    action: "توضیح را پاسخ داد",
    tone: "info" as const,
  },
  {
    at: "۱۶:۰۵",
    actor: "علی رضایی",
    action: "تأیید کرد",
    tone: "success" as const,
  },
];

export default function WorkflowGuidePage() {
  const [activeStep, setActiveStep] = useState(2);
  const [kanban, setKanban] = useState(initialKanban);
  const [approveOpen, setApproveOpen] = useState(false);
  const [note, setNote] = useState("");
  const [decision, setDecision] = useState<"approve" | "reject" | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);

  const isDirty = useMemo(
    () => note.trim().length > 0 || decision !== null,
    [note, decision]
  );

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
      setLastResult(
        decision === "approve" ? "سند تأیید شد" : "سند رد شد"
      );
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
          <li>Activity / Timeline منبع حقیقت برای «چه کسی چه کرد».</li>
          <li>Kanban نمای مدیریتی · کارت فقط جابه‌جایی منطقی با permission.</li>
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
                        done &&
                          "border-emerald-500 bg-emerald-500 text-white",
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
        title="۳) Kanban — نمای ستونی وضعیت"
        description="مدیریت بصری صف تأیید. جابه‌جایی فقط با منطق مجاز."
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {columns.map((col) => (
            <div
              key={col.key}
              className={cn(
                "rounded-xl border border-border/70 p-2",
                col.tone
              )}
            >
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-medium">{col.label}</span>
                <Badge variant="secondary" className="text-[10px]">
                  {toFa(kanban.filter((c) => c.column === col.key).length)}
                </Badge>
              </div>
              <div className="space-y-2">
                {kanban
                  .filter((c) => c.column === col.key)
                  .map((card) => (
                    <div
                      key={card.id}
                      className="rounded-lg border border-border/60 bg-card p-2.5 shadow-sm"
                    >
                      <div className="font-mono text-xs text-primary">
                        {card.title}
                      </div>
                      <div className="mt-0.5 text-[11px] text-muted-foreground">
                        {card.meta}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          در محصول واقعی drag-and-drop فقط اگر permission و transition مجاز باشد.
        </p>
      </GuideSection>

      <GuideSection
        title="۴) Timeline — تاریخچه تصمیم"
        description="چه کسی، چه زمانی، چه کرد."
      >
        <div className="relative space-y-0 rounded-xl border border-border/70 bg-card p-4">
          {timeline.map((item, i) => (
            <div key={i} className="relative flex gap-3 pb-5 last:pb-0">
              {i < timeline.length - 1 ? (
                <div className="absolute right-[11px] top-6 bottom-0 w-px bg-border" />
              ) : null}
              <div
                className={cn(
                  "relative z-10 mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border bg-card",
                  item.tone === "success" &&
                    "border-emerald-500 text-emerald-600",
                  item.tone === "warning" &&
                    "border-amber-500 text-amber-600",
                  item.tone === "info" && "border-primary text-primary",
                  item.tone === "default" && "border-border text-muted-foreground"
                )}
              >
                {item.tone === "success" ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : item.tone === "warning" ? (
                  <MessageSquare className="h-3 w-3" />
                ) : (
                  <Circle className="h-2.5 w-2.5 fill-current" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="text-sm font-medium">{item.actor}</span>
                  <span className="text-[11px] text-muted-foreground" dir="ltr">
                    {item.at}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{item.action}</p>
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
              text: "ارسال برای تأیید توسط سارا",
              time: "۲ ساعت پیش",
            },
            {
              icon: MessageSquare,
              text: "یادداشت علی: مبلغ را بررسی کنید",
              time: "۱ ساعت پیش",
            },
            {
              icon: ThumbsUp,
              text: "تأیید توسط علی رضایی",
              time: "۲۰ دقیقه پیش",
            },
            {
              icon: CheckCircle2,
              text: "ثبت نهایی در حسابداری",
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
        description="اسناد منتظر اقدام کاربر جاری."
      >
        <div className="overflow-hidden rounded-xl border border-border/70 bg-card">
          {[
            {
              code: "SO-1403-042",
              type: "فاکتور فروش",
              wait: "تأیید",
              since: "۴۵ دقیقه",
            },
            {
              code: "PO-1403-021",
              type: "سفارش خرید",
              wait: "تأیید",
              since: "۲ ساعت",
            },
            {
              code: "INV-DOC-008",
              type: "سند انبار",
              wait: "بررسی",
              since: "دیروز",
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
              <li>Stepper شفاف برای وضعیت فعلی</li>
              <li>تأیید/رد با یادداشت اختیاری</li>
              <li>
                Overlay dirty: فقط ثبت/انصراف می‌بندد (UI-02)
              </li>
              <li>Timeline و Activity برای حسابرسی</li>
              <li>بدون رفرش بعد از تصمیم</li>
            </ul>
          </div>
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <div className="mb-2 font-medium text-destructive">انجام نده</div>
            <ul className="list-disc space-y-1.5 pr-5 text-xs text-muted-foreground">
              <li>دکمهٔ «تأیید» بدون permission</li>
              <li>پرش وضعیت خارج از تعریف Workflow</li>
              <li>بستن Modal dirty با کلیک بیرون</li>
              <li>پنهان کردن تاریخچه تصمیم</li>
              <li>جابه‌جایی Kanban بدون transition مجاز</li>
            </ul>
          </div>
        </div>
      </GuideSection>

      <div className="flex flex-wrap gap-2 border-t border-border/60 pt-4">
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/overlays">UI-07 Overlays</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide/layout">UI-02 Layout (قواعد Overlay)</a>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href="/dashboard/ui-guide">فهرست راهنما</a>
        </Button>
      </div>
    </div>
  );
}
