"use client";

import { toFaDigits, toAsciiDigits } from "@/shared/lib/utils";

type AccountOpt = { account_id: string; account_code: string | number; name: string };

export function AccountTypeahead({
  lineKey,
  valueId,
  label,
  options,
  recentIds,
  focused,
  query,
  highlightIdx,
  onFocus,
  onQueryChange,
  onHighlightChange,
  onSelect,
  onBlurClose,
}: {
  lineKey: string;
  valueId: string;
  label: string;
  options: AccountOpt[];
  recentIds: string[];
  focused: boolean;
  query: string;
  highlightIdx: number;
  onFocus: () => void;
  onQueryChange: (q: string) => void;
  onHighlightChange: (i: number) => void;
  onSelect: (id: string) => void;
  onBlurClose: () => void;
}) {
  const filtered = (() => {
    const q = query.trim();
    const ascii = toAsciiDigits(q);
    let base = options;
    if (q) {
      base = options.filter(
        (a) =>
          a.name.includes(q) ||
          String(a.account_code).includes(ascii) ||
          toFaDigits(a.account_code).includes(q)
      );
    }
    if (!recentIds.length || q) return base;
    const set = new Set(recentIds);
    const recent = recentIds
      .map((id) => base.find((a) => a.account_id === id))
      .filter(Boolean) as AccountOpt[];
    const rest = base.filter((a) => !set.has(a.account_id));
    return [...recent, ...rest];
  })();

  const showList = focused;
  const displayValue = focused ? query : label;

  function pick(idx: number) {
    const a = filtered[idx];
    if (a) onSelect(a.account_id);
  }

  return (
    <div className="relative">
      <input
        data-line-key={lineKey}
        className="h-8 w-full rounded-md border bg-background px-2 text-xs font-mono tabular-nums"
        placeholder="کد یا نام حساب…"
        value={displayValue}
        onFocus={(e) => {
          onFocus();
          e.target.select();
        }}
        onChange={(e) => onQueryChange(e.target.value)}
        onBlur={() => {
          // تأخیر کوتاه تا کلیک روی آیتم لیست ثبت شود
          window.setTimeout(() => onBlurClose(), 150);
        }}
        onKeyDown={(e) => {
          if (!showList && (e.key === "ArrowDown" || e.key === "Enter")) {
            onFocus();
            return;
          }
          if (e.key === "ArrowDown") {
            e.preventDefault();
            onHighlightChange(Math.min(highlightIdx + 1, Math.max(filtered.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            onHighlightChange(Math.max(highlightIdx - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (filtered.length === 1) pick(0);
            else if (filtered[highlightIdx]) pick(highlightIdx);
          } else if (e.key === "Escape") {
            e.preventDefault();
            onBlurClose();
            (e.target as HTMLInputElement).blur();
          }
        }}
        autoComplete="off"
      />
      {showList ? (
        <div className="absolute z-50 mt-0.5 max-h-52 w-full min-w-[220px] overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md">
          {filtered.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">موردی نیست</div>
          ) : (
            filtered.slice(0, 50).map((a, i) => (
              <button
                key={a.account_id}
                type="button"
                className={
                  "flex w-full items-center gap-2 px-2 py-1.5 text-right text-xs hover:bg-accent " +
                  (i === highlightIdx ? "bg-accent" : "")
                }
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(a.account_id);
                }}
                onMouseEnter={() => onHighlightChange(i)}
              >
                <span className="font-mono tabular-nums text-muted-foreground shrink-0">
                  {toFaDigits(a.account_code)}
                </span>
                <span className="truncate">{a.name}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}
