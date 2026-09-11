"use client";

import { useState } from "react";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileUp,
  Inbox,
  PackageOpen,
  Search,
  ZoomIn,
  X,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Progress } from "@/shared/components/ui/progress";
import { Accordion, AccordionItem } from "@/shared/components/ui/accordion";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/shared/components/ui/tooltip";
import { cn } from "@/shared/lib/utils";

const gallery = [
  {
    id: "1",
    title: "انبار مرکزی",
    src: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?w=800&q=80",
  },
  {
    id: "2",
    title: "قفسه کالا",
    src: "https://images.unsplash.com/photo-1553413077-190dd305871c?w=800&q=80",
  },
  {
    id: "3",
    title: "بارگیری",
    src: "https://images.unsplash.com/photo-1566576721346-d6a2a719b6b0?w=800&q=80",
  },
  {
    id: "4",
    title: "بسته‌بندی",
    src: "https://images.unsplash.com/photo-1578575437130-527eed3abbec?w=800&q=80",
  },
];

const steps = ["اطلاعات پایه", "موجودی اولیه", "بررسی", "ثبت نهایی"];

export function ShowcaseExtras() {
  const [lightbox, setLightbox] = useState<(typeof gallery)[number] | null>(null);
  const [progress, setProgress] = useState(62);
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);

  function simulateUpload() {
    setUploading(true);
    setProgress(8);
    const timer = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) {
          clearInterval(timer);
          setUploading(false);
          toast.success("بارگذاری کامل شد", { description: "فایل پیوست به سند اضافه شد." });
          return 100;
        }
        return p + 12;
      });
    }, 180);
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-5">
        {/* Breadcrumb + steps */}
        <Card>
          <CardHeader>
            <CardTitle>مسیر صفحه و ویزارد مراحل</CardTitle>
            <CardDescription>Breadcrumb و Stepper برای صفحات چندمرحله‌ای</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <nav className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
              <span className="hover:text-foreground">داشبورد</span>
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="hover:text-foreground">انبار</span>
              <ChevronLeft className="h-3.5 w-3.5" />
              <span className="font-medium text-foreground">کالای جدید</span>
            </nav>

            <div className="flex flex-wrap items-center gap-2">
              {steps.map((label, index) => {
                const n = index + 1;
                const done = n < step;
                const active = n === step;
                return (
                  <div key={label} className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setStep(n)}
                      className={cn(
                        "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs transition",
                        done && "bg-primary/10 text-primary",
                        active && "btn-primary-gradient text-primary-foreground",
                        !done && !active && "bg-muted text-muted-foreground"
                      )}
                    >
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-black/10 text-[10px]">
                        {done ? <Check className="h-3 w-3" /> : n}
                      </span>
                      {label}
                    </button>
                    {index < steps.length - 1 && <div className="hidden h-px w-4 bg-border sm:block" />}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Gallery + lightbox */}
        <Card>
          <CardHeader>
            <CardTitle>گالری تصویر با بزرگ‌نمایی</CardTitle>
            <CardDescription>کلیک روی تصویر = نمایش تمام‌صفحه</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              {gallery.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  className="group relative overflow-hidden rounded-xl border border-border/70 bg-muted/30"
                  onClick={() => setLightbox(item)}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.src} alt={item.title} className="h-28 w-full object-cover transition duration-300 group-hover:scale-105" />
                  <div className="absolute inset-0 flex items-end bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                    <span className="flex items-center gap-1 text-[11px] text-white">
                      <ZoomIn className="h-3.5 w-3.5" />
                      {item.title}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {lightbox && (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-[2px]"
            onClick={() => setLightbox(null)}
          >
            <div
              className="relative max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-2xl bg-background shadow-[var(--shadow-lg)]"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between border-b px-3 py-2">
                <span className="text-sm font-medium">{lightbox.title}</span>
                <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setLightbox(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={lightbox.src} alt={lightbox.title} className="max-h-[75vh] w-full object-contain bg-black/5" />
            </div>
          </div>
        )}

        <div className="grid gap-3 lg:grid-cols-2">
          {/* Upload + progress */}
          <Card>
            <CardHeader>
              <CardTitle>بارگذاری فایل و نوار پیشرفت</CardTitle>
              <CardDescription>Dropzone ظاهری + Progress</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <button
                type="button"
                onClick={simulateUpload}
                className="flex w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-primary/30 bg-primary/[0.03] px-4 py-8 text-center transition hover:bg-primary/[0.06]"
              >
                {uploading ? <Loader2 className="h-6 w-6 animate-spin text-primary" /> : <FileUp className="h-6 w-6 text-primary" />}
                <div className="text-sm font-medium">فایل را اینجا رها کنید یا کلیک کنید</div>
                <div className="text-xs text-muted-foreground">PDF، تصویر یا اکسل تا ۱۰ مگابایت</div>
              </button>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span>پیشرفت بارگذاری</span>
                  <span>{progress}٪</span>
                </div>
                <Progress value={progress} />
              </div>
            </CardContent>
          </Card>

          {/* Empty + tooltips */}
          <Card>
            <CardHeader>
              <CardTitle>حالت خالی و راهنمای Tooltip</CardTitle>
              <CardDescription>Empty state برای لیست بدون داده</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex flex-col items-center justify-center rounded-xl border border-dashed bg-muted/20 px-4 py-8 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                  <PackageOpen className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="text-sm font-medium">هنوز سندی ثبت نشده</div>
                <p className="mt-1 max-w-xs text-xs text-muted-foreground">
                  با ایجاد اولین سند انبار، لیست اینجا نمایش داده می‌شود.
                </p>
                <Button size="sm" className="mt-3">
                  ایجاد سند
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="outline">
                      <Search className="h-3.5 w-3.5" />
                      جستجوی پیشرفته
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>فیلتر بر اساس انبار، تاریخ و وضعیت</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="secondary">
                      <Inbox className="h-3.5 w-3.5" />
                      صندوق کار
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>اسناد نیازمند اقدام شما</TooltipContent>
                </Tooltip>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Accordion + avatar chips */}
        <div className="grid gap-3 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>آکاردئون راهنما</CardTitle>
              <CardDescription>برای FAQ و توضیحات فشرده</CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion defaultValue="a1">
                <AccordionItem id="a1" title="چطور سند را برای تأیید بفرستم؟">
                  پس از تکمیل اقلام، از دکمه «ارسال برای تأیید» استفاده کنید. وضعیت به «در انتظار» تغییر می‌کند.
                </AccordionItem>
                <AccordionItem id="a2" title="تفاوت حواله و رسید چیست؟">
                  رسید برای ورود کالا به انبار و حواله برای خروج کالا از انبار استفاده می‌شود.
                </AccordionItem>
                <AccordionItem id="a3" title="آیا می‌توان سند تأییدشده را ویرایش کرد؟">
                  خیر. برای اصلاح باید سند اصلاحی یا برگشت ثبت شود تا ردپای حسابداری حفظ شود.
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>آواتار، برچسب و وضعیت آنلاین</CardTitle>
              <CardDescription>الگوهای نمایش کاربر و تگ</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="flex -space-x-2 space-x-reverse">
                  {["کا", "مر", "سآ", "نر"].map((t, i) => (
                    <div
                      key={t}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-background text-[11px] text-white"
                      style={{
                        background: ["#166534", "#0F766E", "#4F46E5", "#B45309"][i],
                      }}
                    >
                      {t}
                    </div>
                  ))}
                </div>
                <div className="text-xs text-muted-foreground">۴ تأییدکننده در جریان کار</div>
              </div>

              <div className="flex flex-wrap gap-1.5">
                <Badge>انبار</Badge>
                <Badge variant="secondary">خرید</Badge>
                <Badge variant="warning">فوری</Badge>
                <Badge variant="success">حسابرسی‌شده</Badge>
                <Badge variant="outline">نسخه ۲</Badge>
              </div>

              <div className="flex items-center gap-2 rounded-lg border bg-muted/20 px-3 py-2 text-sm">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
                </span>
                سیستم همگام‌سازی فعال است
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </TooltipProvider>
  );
}
