"use client";

import { ShowcaseExtras } from "./showcase-extras";
import { Button } from "@/shared/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/shared/components/ui/alert";
import { toast } from "sonner";

export default function ShowcasePage() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">نمایشگاه کامپوننت‌ها</h1>
          <p className="text-xs text-muted-foreground">
            المان‌های تکمیلی: گالری، لایت‌باکس، پیشرفت، آکاردئون، Empty State و ویزارد
          </p>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <Button
            size="sm"
            variant="outline"
            onClick={() => toast.message("یادآوری", { description: "۳ سند در انتظار تأیید شماست." })}
          >
            نوتیف ساده
          </Button>
          <Button
            size="sm"
            onClick={() => toast.success("ذخیره شد", { description: "سند با موفقیت ثبت شد." })}
          >
            نوتیف موفقیت
          </Button>
          <Button
            size="sm"
            variant="destructive"
            onClick={() => toast.error("خطا در ثبت", { description: "ارتباط با سرور برقرار نشد." })}
          >
            نوتیف خطا
          </Button>
        </div>
      </div>

      <Alert className="border-primary/15 bg-gradient-to-l from-primary/[0.06] to-transparent py-3">
        <AlertTitle className="text-sm">وضعیت نمایشگاه</AlertTitle>
        <AlertDescription className="text-xs">
          بخش‌های جدول/نمودار قبلی همچنان در کامیت‌های اخیر موجودند؛ این صفحه الان روی المان‌های جدید
          (تصویر، لایت‌باکس، آپلود، استپر و ...) متمرکز است. در دور بعدی هر دو بخش را یکپارچه می‌کنیم.
        </AlertDescription>
      </Alert>

      <ShowcaseExtras />
    </div>
  );
}
