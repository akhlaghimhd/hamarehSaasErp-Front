"use client";

import {
  Bell,
  Search,
  User,
  Settings,
  LogOut,
  Building2,
  HelpCircle,
  PanelRightOpen,
  Menu,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/shared/components/ui/dropdown-menu";
import { useSidebar } from "@/shared/components/layout/sidebar-context";
import { authService, useAuthStore } from "@/auth";

function initials(first?: string, last?: string): string {
  const a = (first ?? "").trim().charAt(0);
  const b = (last ?? "").trim().charAt(0);
  return `${a}${b}` || "ک";
}

export function AppHeader() {
  const { collapsed, toggle, toggleMobile } = useSidebar();
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const activeTenantId = useAuthStore((s) => s.activeTenantId);
  const organization = useAuthStore((s) => s.organization);
  const securityContext = useAuthStore((s) => s.securityContext);

  const displayName = user
    ? `${user.first_name} ${user.last_name}`.trim() || user.email
    : "کاربر";

  const roleLabel =
    securityContext?.roles?.[0]?.name ||
    securityContext?.roles?.[0]?.code ||
    null;
  const tenantLabel =
    organization?.tenant_name ||
    organization?.tenant_code ||
    null;

  const handleLogout = async () => {
    await authService.logout();
    toast.success("خروج با موفقیت انجام شد");
    router.replace("/login");
  };

  return (
    <header className="header-blur sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-border/70 px-3 md:px-4">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 md:hidden"
        onClick={toggleMobile}
        aria-label="منوی اصلی"
      >
        <Menu className="h-4 w-4" />
      </Button>

      {collapsed && (
        <Button
          variant="ghost"
          size="icon"
          className="hidden h-8 w-8 md:inline-flex"
          onClick={toggle}
          title="باز کردن منو"
          aria-label="باز کردن منو"
        >
          <PanelRightOpen className="h-4 w-4" />
        </Button>
      )}

      <div className="relative max-w-md flex-1">
        <Search className="absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
        <Input className="h-9 pr-8 text-sm" placeholder="جستجو در سیستم..." />
      </div>

      <div className="mr-auto flex items-center gap-1.5">
        <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="اعلان‌ها">
          <Bell className="h-4 w-4" />
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 gap-2 rounded-full px-1.5">
              <div className="brand-mark flex h-7 w-7 items-center justify-center rounded-full text-[11px] text-white">
                {initials(user?.first_name, user?.last_name)}
              </div>
              <span className="hidden max-w-[9rem] truncate text-xs font-medium sm:inline">
                {displayName}
              </span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="space-y-0.5">
              <div>حساب کاربری</div>
              {user?.email && (
                <div className="text-xs font-normal text-muted-foreground" dir="ltr">
                  {user.email}
                </div>
              )}
              {roleLabel && (
                <div className="text-[11px] font-normal text-muted-foreground">{roleLabel}</div>
              )}
              {(tenantLabel || activeTenantId) && (
                <div className="truncate text-[11px] font-normal text-muted-foreground">
                  سازمان: {tenantLabel ?? activeTenantId}
                </div>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>
              <User className="h-4 w-4" />
              پروفایل من
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Building2 className="h-4 w-4" />
              سازمان فعال
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="h-4 w-4" />
              تنظیمات
            </DropdownMenuItem>
            <DropdownMenuItem>
              <HelpCircle className="h-4 w-4" />
              راهنما
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={(e) => {
                e.preventDefault();
                void handleLogout();
              }}
            >
              <LogOut className="h-4 w-4" />
              خروج از سیستم
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
