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
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Separator } from "@/shared/components/ui/separator";
import { cn } from "@/shared/lib/utils";
import { Menu, FileText, AlertTriangle } from "lucide-react";

const meta = {
  code: "UI-02",
  title: "Layout & Structure",
  description:
    "اسکلت صفحه، ترکیب فرم+جدول، به‌روزرسانی درجا، و قوانین Modal/Drawer برای ثبت داده حیاتی ERP.",
  phase: "فاز ۱",
  status: "ready" as const,
};

type DocRow = {
  code: string;
  title: string;
  status: string;
  date: string;
  isNew?: boolean;
};

const initialRows: DocRow[] = [
  { code: "GR-001", title: "ورود محموله", status: "پیش‌نویس", date: "1404/06/01" },
  { code: "GI-014", title: "خروج مصرف", status: "در انتظار", date: "1404/06/02" },
  { code: "TR-003", title: "انتقال بین انبار", status: "تأیید شده", date: "1404/06/03" },
  { code: "GR-002", title: "ورود برگشتی", status: "پیش‌نویس", date: "1404/06/04" },
];

export default function LayoutGuidePage() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [rows, setRows] = useState<DocRow[]>(initialRows);
  const [title, setTitle] = useState("");
  const [warehouse, setWarehouse] = useState("");
  const [lastAction, setLastAction] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmClose, setConfirmClose] = useState<null | "modal" | "drawer">(null);

  const isDirty = useMemo(
    () => title.trim().length > 0 || warehouse.trim().length > 0,
    [title, warehouse]
  );

  function resetFormFields() {
    setTitle("");
    setWarehouse("");
  }

  function requestClose(source: "modal" | "drawer") {
    if (isDirty) {
      setConfirmClose(source);
      return;
    }
    forceClose(source);
  }

  function forceClose(source: "modal" | "drawer") {
    if (source === "modal") setFormOpen(false);
    if (source === "drawer") setDrawerOpen(false);
    setConfirmClose(null);
    resetFormFields();
    setLastAction(
      "فرم بسته شد بدون ذخیره — داده ثبت نشده. (کاربر نباید تصور کند ذخیره شده است.)"
    );
  }

  function handleSaveFromOverlay(source: "modal" | "drawer") {
    if (!title.trim()) {
      setLastAction("عنوان الزامی است — Overlay باز ماند؛ صفحه رفرش نشد.");
      return;
    }
    setSaving(true);
    window.setTimeout(() => {
      const code = `GR-${String(100 + rows.length).slice(-3)}`;
      const next: DocRow = {
        code,
        title: title.trim(),
        status: "پیش‌نویس",
        date: "همین الآن",
        isNew: true,
      };
      setRows((prev) => [next, ...prev.map((r) => ({ ...r, isNew: false }))]);
      setSaving(false);
      setFormOpen(false);
      setDrawerOpen(false);
      setConfirmClose(null);
      resetFormFields();
      setLastAction(
        `ذخیره موفق از ${source === "modal" ? "Modal" : "Drawer"}: ${code} به جدول اضافه شد · بدون رفرش.`
      );
    }, 400);
  }

  return (
    <div className="space-y-6">
      <GuidePageHeader meta={meta} />

      <GuideRulesBox title="قوانین کلیدی این صفحه">
        <ul className="list-disc space-y-1 pr-5">
          <li>بدون رفرش کامل بعد از mutation داخل صفحه.</li>
          <li>
            برای ثبت/ویرایش حیاتی ERP:{