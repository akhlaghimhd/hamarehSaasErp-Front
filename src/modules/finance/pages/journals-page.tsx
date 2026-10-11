"use client";

/**
 * Temporary stub — develop journals-page was corrupted during large-file push.
 * Restore full FIN-CSN-F1 page:
 *   python scripts/restore_journals_f1.py
 * Or:
 *   git checkout 052df6197ca66f3a7b9542d299e67493b219bc3b -- src/modules/finance/pages/journals-page.tsx
 *   git apply patches/finance-journals-csn-f1.patch
 */
export function JournalsPage() {
  return (
    <div className="p-6 space-y-3 text-sm" dir="rtl">
      <h1 className="text-base font-semibold">بازیابی صفحه اسناد حسابداری</h1>
      <p className="text-muted-foreground leading-relaxed">
        نسخهٔ کامل صفحه (FIN-CSN-F1: فیلتر شرکت، شماره DR/JE، انتخاب شرکت در ایجاد) روی
        develop به‌صورت قطعات فشرده در <code className="text-xs">patches/journals_f1_b64</code> است.
      </p>
      <pre className="rounded-md border bg-muted/40 p-3 text-xs overflow-x-auto" dir="ltr">
{`python scripts/restore_journals_f1.py
git add src/modules/finance/pages/journals-page.tsx
git commit -m "feat(fin): FIN-CSN-F1 journals multi-company + DR/JE display"`}
      </pre>
    </div>
  );
}
