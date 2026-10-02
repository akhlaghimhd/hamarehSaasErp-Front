/** Request sheet for privileged / emergency access — right side, searchable pickers */
"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Loader2, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle,
} from "@/shared/components/ui/sheet";
import { ApiClientError } from "@/api";
import type { TenantUserDto } from "../types";
import type { RoleDto } from "../services/role-service";
import { privilegedAccessService } from "../services/privileged-access-service";

const DURATION_PRESETS: { minutes: number; label: string; hint?: string }[] = [
  { minutes: 60, label: "۱ ساعت" },
  { minutes: 480, label: "۸ ساعت", hint: "یک روز کاری" },
  { minutes: 10080, label: "۷ روز" },
  { minutes: 43200, label: "۳۰ روز", hint: "یک ماه" },
];

function shortId(id?: string | null): string {
  if (!id) return "—";
  return id.length > 10 ? `${id.slice(0, 8)}…` : id;
}

export function PrivilegedRequestSheet({
  open,
  onOpenChange,
  members,
  roles,
  userLabel,
  onCreated,
  initialUserId = null,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  members: TenantUserDto[];
  roles: RoleDto[];
  userLabel: Map<string, string>;
  onCreated: () => void;
  /** Prefill beneficiary (e.g. from member detail deep-link). */
  initialUserId?: string | null;
}) {
  const [userId, setUserId] = useState("");
  const [roleId, setRoleId] = useState("");
  const [reason, setReason] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [userSearch, setUserSearch] = useState("");
  const [roleSearch, setRoleSearch] = useState("");

  useEffect(() => {
    if (open && initialUserId) {
      setUserId(initialUserId);
      setUserSearch("");
    }
  }, [open, initialUserId]);

  const privilegedRoles = useMemo(
    () => roles.filter((r) => Boolean(r.is_privileged) && Number(r.status) === 1),
    [roles]
  );

  const formMembers = useMemo(() => {
    const term = userSearch.trim().toLowerCase();
    const list = members.filter((m) => Boolean(m.user_id));
    if (!term) return list.slice(0, 100);
    return list
      .filter((m) => {
        const uid = String(m.user_id ?? "");
        const label = (
          userLabel.get(uid) ??
          [m.user?.email, m.user?.mobile].filter(Boolean).join(" ")
        ).toLowerCase();
        return label.includes(term) || uid.toLowerCase().includes(term);
      })
      .slice(0, 100);
  }, [members, userSearch, userLabel]);

  const formRoles = useMemo(() => {
    const term = roleSearch.trim().toLowerCase();
    if (!term) return privilegedRoles;
    return privilegedRoles.filter((r) =>
      [r.name, r.code].filter(Boolean).join(" ").toLowerCase().includes(term)
    );
  }, [privilegedRoles, roleSearch]);

  const requestMut = useMutation({
    mutationFn: () =>
      privilegedAccessService.request({
        user_id: userId,
        tenant_role_id: roleId,
        reason: reason.trim(),
        duration_minutes: Math.max(5, Math.min(43200, Number(durationMinutes) || 60)),
      }),
    onSuccess: () => {
      toast.success("درخواست دسترسی اضطراری ثبت شد");
      setUserId(""); setRoleId(""); setReason(""); setDurationMinutes("60");
      setUserSearch(""); setRoleSearch("");
      onOpenChange(false);
      onCreated();
    },
    onError: (e) =>
      toast.error(e instanceof ApiClientError ? e.message : "ثبت درخواست ناموفق بود"),
  });

  return (
    <Sheet
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) { setUserSearch(""); setRoleSearch(""); }
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-md"
        dir="rtl"
      >
        <SheetHeader className="border-b border-border/60 px-5 py-4 text-start">
          <SheetTitle>درخواست دسترسی اضطراری</SheetTitle>
          <p className="text-xs font-normal text-muted-foreground">
            نقش ممتاز موقتاً به کاربر اختصاص داده می‌شود؛ پس از تأیید تا پایان مدت فعال است.
          </p>
        </SheetHeader>

        <div className="flex flex-1 flex-col gap-5 px-5 py-5">
          <div className="space-y-2">
            <Label>کاربر</Label>
            {userId ? (
              <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{userLabel.get(userId) ?? shortId(userId)}</div>
                  <div dir="ltr" className="font-mono text-[10px] text-muted-foreground">{shortId(userId)}</div>
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 text-xs"
                  disabled={requestMut.isPending}
                  onClick={() => { setUserId(""); setUserSearch(""); }}>
                  تغییر
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                    placeholder="جستجوی نام، ایمیل یا موبایل…" className="h-9 ps-8"
                    disabled={requestMut.isPending} autoFocus />
                </div>
                <div className="max-h-48 overflow-y-auto rounded-lg border border-border/70">
                  {formMembers.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">عضوی یافت نشد</p>
                  ) : formMembers.map((m) => {
                    const uid = String(m.user_id ?? "");
                    if (!uid) return null;
                    return (
                      <button key={uid} type="button"
                        className="flex w-full flex-col gap-0.5 border-b border-border/40 px-3 py-2 text-start last:border-0 hover:bg-muted/50"
                        onClick={() => { setUserId(uid); setUserSearch(""); }}>
                        <span className="truncate text-sm font-medium">{userLabel.get(uid) ?? shortId(uid)}</span>
                        <span className="truncate text-[11px] text-muted-foreground">
                          {[m.user?.email, m.user?.mobile].filter(Boolean).join(" · ") || shortId(uid)}
                        </span>
                      </button>
                    );
                  })}
                </div>
                <p className="text-[11px] text-muted-foreground">با جستجو فیلتر کنید (حداکثر ۱۰۰ نتیجه).</p>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>نقش ممتاز</Label>
            {roleId ? (
              <div className="flex items-center gap-2 rounded-lg border border-border/70 bg-muted/30 px-3 py-2">
                <div className="min-w-0 flex-1 truncate text-sm font-medium">
                  {roles.find((r) => r.tenant_role_id === roleId)?.name || shortId(roleId)}
                </div>
                <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 text-xs"
                  disabled={requestMut.isPending}
                  onClick={() => { setRoleId(""); setRoleSearch(""); }}>
                  تغییر
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="pointer-events-none absolute start-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)}
                    placeholder="جستجوی نقش ممتاز…" className="h-9 ps-8"
                    disabled={requestMut.isPending || privilegedRoles.length === 0} />
                </div>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-border/70">
                  {privilegedRoles.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">
                      نقش ممتازی نیست — از صفحه نقش‌ها علامت بزنید
                    </p>
                  ) : formRoles.length === 0 ? (
                    <p className="px-3 py-4 text-center text-xs text-muted-foreground">نقشی با این جستجو نیست</p>
                  ) : formRoles.map((r) => (
                    <button key={r.tenant_role_id} type="button"
                      className="flex w-full border-b border-border/40 px-3 py-2 text-start text-sm last:border-0 hover:bg-muted/50"
                      onClick={() => { setRoleId(r.tenant_role_id); setRoleSearch(""); }}>
                      {r.name || r.code}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>مدت دسترسی</Label>
            <div className="grid grid-cols-2 gap-2">
              {DURATION_PRESETS.map((p) => {
                const active = Number(durationMinutes) === p.minutes;
                return (
                  <button
                    key={p.minutes}
                    type="button"
                    disabled={requestMut.isPending}
                    onClick={() => setDurationMinutes(String(p.minutes))}
                    className={
                      "rounded-lg border px-3 py-2.5 text-start transition-colors " +
                      (active
                        ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                        : "border-border/70 hover:bg-muted/40")
                    }
                  >
                    <div className="text-sm font-medium">{p.label}</div>
                    {p.hint ? (
                      <div className="text-[11px] text-muted-foreground">{p.hint}</div>
                    ) : (
                      <div className="text-[11px] text-muted-foreground tabular-nums">
                        {p.minutes} دقیقه
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground">
              پس از پایان مدت، دسترسی خودکار لغو می‌شود. حداکثر ۳۰ روز.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pa-reason">دلیل</Label>
            <Textarea id="pa-reason" value={reason} onChange={(e) => setReason(e.target.value)}
              placeholder="مثال: رفع حادثه تولید در انبار مرکزی…" disabled={requestMut.isPending}
              rows={4} className="resize-none text-sm" />
            <p className="text-[11px] text-muted-foreground">حداقل ۵ کاراکتر</p>
          </div>
        </div>

        <SheetFooter className="mt-auto flex-row gap-2 border-t border-border/60 px-5 py-4 sm:justify-start">
          <Button type="button" variant="outline" disabled={requestMut.isPending} onClick={() => onOpenChange(false)}>
            انصراف
          </Button>
          <Button type="button"
            disabled={
              requestMut.isPending || !userId || !roleId || reason.trim().length < 5 || privilegedRoles.length === 0
            }
            onClick={() => void requestMut.mutateAsync()}>
            {requestMut.isPending ? (
              <><Loader2 className="me-1.5 h-3.5 w-3.5 animate-spin" />در حال ثبت…</>
            ) : "ثبت درخواست"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
