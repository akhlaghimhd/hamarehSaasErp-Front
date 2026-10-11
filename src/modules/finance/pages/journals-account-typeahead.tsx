"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { toFaDigits, toAsciiDigits } from "@/shared/lib/utils";

export type TypeaheadOption = {
  id: string;
  label: string;
  searchText?: string;
};

type Props = {
  valueId: string;
  displayLabel: string;
  options: TypeaheadOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  dataLineKey?: string;
  onSelect: (id: string) => void;
};

const VAZIR = { fontFamily: "var(--font-vazirmatn), Tahoma, Arial, sans-serif" } as const;

function digitsToFa(s: string): string {
  return s.replace(/[0-9]/g, (d) => toFaDigits(d));
}

export function OptionTypeahead({
  valueId,
  displayLabel,
  options,
  placeholder = "جستجو…",
  disabled,
  className,
  dataLineKey,
  onSelect,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const [panel, setPanel] = useState<{ top: number; left: number; width: number } | null>(null);

  const filtered = (() => {
    const q = query.trim();
    if (!q) return options;
    const ascii = toAsciiDigits(q).toLowerCase();
    const ql = q.toLowerCase();
    return options.filter((o) => {
      const hay = (o.searchText ?? o.label).toLowerCase();
      return (
        hay.includes(ql) ||
        hay.includes(ascii) ||
        toAsciiDigits(hay).includes(ascii) ||
        toFaDigits(hay).includes(q)
      );
    });
  })();

  function placePanel() {
    const el = inputRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setPanel({ top: r.bottom + 2, left: r.left, width: Math.max(r.width, 220) });
  }

  useLayoutEffect(() => {
    if (!open) return;
    placePanel();
    const onScroll = () => placePanel();
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [open, query]);

  useEffect(() => {
    if (open) setHighlight(0);
  }, [query, open]);

  function pick(idx: number) {
    const o = filtered[idx];
    if (!o) return;
    onSelect(o.id);
    setOpen(false);
    setQuery("");
  }

  return (
    <div className="relative min-w-0">
      <input
        ref={inputRef}
        data-line-key={dataLineKey}
        disabled={disabled}
        className={
          className ??
          "h-8 w-full min-w-0 rounded-md border bg-background px-1.5 text-[11px] tabular-nums"
        }
        style={VAZIR}
        placeholder={placeholder}
        value={open ? digitsToFa(query) : displayLabel}
        onFocus={(e) => {
          setOpen(true);
          setQuery("");
          e.target.select();
          requestAnimationFrame(placePanel);
        }}
        onChange={(e) => {
          setOpen(true);
          setQuery(digitsToFa(e.target.value));
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setOpen(false);
            setQuery("");
          }, 150);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setOpen(true);
            setHighlight((h) => Math.min(h + 1, Math.max(filtered.length - 1, 0)));
          } else if (e.key === "ArrowUp") {
            e.preventDefault();
            setHighlight((h) => Math.max(h - 1, 0));
          } else if (e.key === "Enter") {
            e.preventDefault();
            if (filtered.length === 1) pick(0);
            else if (filtered[highlight]) pick(highlight);
          } else if (e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            setQuery("");
            inputRef.current?.blur();
          }
        }}
        autoComplete="off"
      />
      {open && panel ? (
        <div
          className="z-[80] max-h-52 overflow-auto rounded-md border bg-popover text-popover-foreground shadow-md"
          style={{ position: "fixed", top: panel.top, left: panel.left, width: panel.width, ...VAZIR }}
        >
          {filtered.length === 0 ? (
            <div className="px-2 py-1.5 text-xs text-muted-foreground">موردی نیست</div>
          ) : (
            filtered.slice(0, 80).map((o, i) => (
              <button
                key={o.id || "__empty"}
                type="button"
                className={
                  "flex w-full items-center px-2 py-1.5 text-right text-xs hover:bg-accent " +
                  (i === highlight ? "bg-accent" : "")
                }
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(o.id);
                  setOpen(false);
                  setQuery("");
                }}
                onMouseEnter={() => setHighlight(i)}
              >
                <span className="truncate">{o.label}</span>
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}

export function AccountTypeahead(props: {
  lineKey: string;
  valueId: string;
  label: string;
  options: { account_id: string; account_code: string | number; name: string }[];
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
  const opts: TypeaheadOption[] = props.options.map((a) => ({
    id: a.account_id,
    label: `${toFaDigits(a.account_code)} — ${a.name}`,
    searchText: `${a.account_code} ${a.name}`,
  }));
  const ordered =
    props.recentIds.length && !props.query.trim()
      ? [
          ...(props.recentIds
            .map((id) => opts.find((o) => o.id === id))
            .filter(Boolean) as TypeaheadOption[]),
          ...opts.filter((o) => !props.recentIds.includes(o.id)),
        ]
      : opts;

  return (
    <OptionTypeahead
      valueId={props.valueId}
      displayLabel={props.label}
      options={ordered}
      placeholder="کد یا نام حساب…"
      dataLineKey={props.lineKey}
      onSelect={props.onSelect}
    />
  );
}
