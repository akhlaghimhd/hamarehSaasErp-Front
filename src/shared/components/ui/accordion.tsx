"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/shared/lib/utils";

type AccordionContextValue = {
  openId: string | null;
  setOpenId: (id: string | null) => void;
};

const AccordionContext = React.createContext<AccordionContextValue | null>(null);

export function Accordion({
  children,
  className,
  defaultValue,
}: {
  children: React.ReactNode;
  className?: string;
  defaultValue?: string;
}) {
  const [openId, setOpenId] = React.useState<string | null>(defaultValue ?? null);
  return (
    <AccordionContext.Provider value={{ openId, setOpenId }}>
      <div className={cn("divide-y rounded-xl border border-border/70 bg-card/60", className)}>{children}</div>
    </AccordionContext.Provider>
  );
}

export function AccordionItem({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  const ctx = React.useContext(AccordionContext);
  if (!ctx) throw new Error("AccordionItem must be inside Accordion");
  const open = ctx.openId === id;

  return (
    <div>
      <button
        type="button"
        className="flex w-full items-center justify-between gap-2 px-3 py-2.5 text-right text-sm font-medium hover:bg-muted/40"
        onClick={() => ctx.setOpenId(open ? null : id)}
        aria-expanded={open}
      >
        <span>{title}</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", open && "rotate-180")} />
      </button>
      {open && <div className="px-3 pb-3 text-xs leading-6 text-muted-foreground">{children}</div>}
    </div>
  );
}
