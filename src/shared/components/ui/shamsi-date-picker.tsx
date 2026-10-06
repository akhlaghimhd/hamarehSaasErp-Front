"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import {
  cn,
  toFaDigits,
  formatJalaliDate,
  isoToJalali,
  jalaliToIso,
  jalaliMonthLength,
  currentJalaliYear,
  toJalaliParts,
  toGregorianParts,
} from "@/shared/lib/utils";

const MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

/** شنبه → جمعه */
const WEEKDAYS = ["ش", "ی", "د", "س", "چ", "پ", "ج"];

function todayJalali(): { jy: number; jm: number; jd: number } {
  const n = new Date();
  return toJalaliParts(n.getFullYear(), n.getMonth() + 1, n.getDate());
}

/** weekday of Jalali date: 0=Saturday … 6=Friday (Iran week) */
function jalaliWeekday(jy: number, jm: number, jd: number): number {
  const { gy, gm, gd } = toGregorianParts(jy, jm, jd);
  const d = new Date(gy, gm - 1, gd);
  // JS: 0=Sun … 6=Sat → map so Sat=0
  return (d.getDay() + 1) % 7;
}

export type ShamsiDatePickerProps = {
  value: string;
  onChange: (iso: string) => void;
  /** years around current Jalali year (default 10) */
  yearSpan?: number;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

/**
 * Single trigger field + popup Jalali month calendar.
 * Stores ISO YYYY-MM-DD; displays Persian digits.
 * Popup is fixed + clamped so it never overflows the viewport / sheet.
 */
export function ShamsiDatePicker({
  value,
  onChange,
  yearSpan = 10,
  placeholder = "انتخاب تاریخ",
  className,
  disabled,
}: ShamsiDatePickerProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = isoToJalali(value);
  const today = todayJalali();
  const curYear = currentJalaliYear();

  const [viewJy, setViewJy] = useState(selected?.jy ?? today.jy);
  const [viewJm, setViewJm] = useState(selected?.jm ?? today.jm);

  useEffect(() => {
    if (!open) return;
    if (selected) {
      setViewJy(selected.jy);
      setViewJm(selected.jm);
    } else {
      setViewJy(today.jy);
      setViewJm(today.jm);
    }
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open || !rootRef.current) return;
    const place = () => {
      const rect = rootRef.current!.getBoundingClientRect();
      const width = 280;
      const height = 320;
      let left = rect.left;
      let top = rect.bottom + 4;
      if (left + width > window.innerWidth - 8) left = Math.max(8, window.innerWidth - width - 8);
      if (left < 8) left = 8;
      if (top + height > window.innerHeight - 8) {
        top = rect.top - height - 4;
      }
      if (top < 8) top = 8;
      setPos({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const years = useMemo(() => {
    const half = Math.floor(yearSpan / 2);
    return Array.from({ length: yearSpan }, (_, i) => curYear - half + i);
  }, [curYear, yearSpan]);

  const daysInMonth = jalaliMonthLength(viewJy, viewJm);
  const startWd = jalaliWeekday(viewJy, viewJm, 1);

  const cells = useMemo(() => {
    const list: Array<{ jd: number; empty?: boolean } | null> = [];
    for (let i = 0; i < startWd; i++) list.push(null);
    for (let d = 1; d <= daysInMonth; d++) list.push({ jd: d });
    while (list.length % 7 !== 0) list.push(null);
    return list;
  }, [startWd, daysInMonth]);

  const goMonth = (delta: number) => {
    let m = viewJm + delta;
    let y = viewJy;
    if (m < 1) {
      m = 12;
      y -= 1;
    } else if (m > 12) {
      m = 1;
      y += 1;
    }
    setViewJy(y);
    setViewJm(m);
  };

  const pick = (jd: number) => {
    onChange(jalaliToIso(viewJy, viewJm, jd));
    setOpen(false);
  };

  const display = value ? formatJalaliDate(value) : "";

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex h-9 w-full items-center gap-2 rounded-md border border-input bg-transparent px-3 text-sm",
          "ring-offset-background transition-colors",
          "hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          disabled && "cursor-not-allowed opacity-50",
          !display && "text-muted-foreground"
        )}
      >
        <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
        <span className="flex-1 text-start tabular-nums">
          {display || placeholder}
        </span>
        {value ? (
          <span
            role="button"
            tabIndex={0}
            className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onChange("");
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                e.stopPropagation();
                onChange("");
              }
            }}
            aria-label="پاک کردن تاریخ"
          >
            <X className="h-3.5 w-3.5" />
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            "fixed z-[100] w-[280px] rounded-lg border bg-popover p-3 text-popover-foreground shadow-md",
            "animate-in fade-in-0 zoom-in-95"
          )}
          style={{ top: pos.top, left: pos.left }}
          role="dialog"
          aria-label="تقویم شمسی"
        >
          <div className="mb-2 flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => goMonth(1)}
              aria-label="ماه بعد"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
            <div className="flex flex-1 items-center justify-center gap-1">
              <select
                className="h-8 rounded-md border border-input bg-background px-1 text-sm"
                value={viewJm}
                onChange={(e) => setViewJm(Number(e.target.value))}
              >
                {MONTHS.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
              <select
                className="h-8 rounded-md border border-input bg-background px-1 text-sm tabular-nums"
                value={viewJy}
                onChange={(e) => setViewJy(Number(e.target.value))}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {toFaDigits(y)}
                  </option>
                ))}
              </select>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={() => goMonth(-1)}
              aria-label="ماه قبل"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          <div className="mb-1 grid grid-cols-7 gap-0.5 text-center text-[11px] text-muted-foreground">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1 font-medium">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((cell, idx) => {
              if (!cell) {
                return <div key={`e-${idx}`} className="h-8" />;
              }
              const isSelected =
                !!selected &&
                selected.jy === viewJy &&
                selected.jm === viewJm &&
                selected.jd === cell.jd;
              const isToday =
                today.jy === viewJy &&
                today.jm === viewJm &&
                today.jd === cell.jd;

              return (
                <button
                  key={cell.jd}
                  type="button"
                  onClick={() => pick(cell.jd)}
                  className={cn(
                    "h-8 rounded-md text-sm tabular-nums transition-colors",
                    "hover:bg-accent hover:text-accent-foreground",
                    isSelected &&
                      "bg-primary text-primary-foreground hover:bg-primary/90",
                    !isSelected && isToday && "border border-primary/50 font-semibold"
                  )}
                >
                  {toFaDigits(cell.jd)}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t pt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                onChange("");
                setOpen(false);
              }}
            >
              پاک کردن
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                onChange(jalaliToIso(today.jy, today.jm, today.jd));
                setViewJy(today.jy);
                setViewJm(today.jm);
                setOpen(false);
              }}
            >
              امروز
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
