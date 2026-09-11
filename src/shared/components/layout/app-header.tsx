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
} from "lucide-react";
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

export function AppHeader() {
  const { collapsed, toggle } = useSidebar();

  return (
    <header className="header-blur sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-border/70 px-3 md:px-4">
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
                کا
              </div>
              <span className="hidden text-xs font-medium sm:inline">کاربر نمونه</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-52">
            <DropdownMenuLabel>حساب کاربری</DropdownMenuLabel>
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
            <DropdownMenuItem className="text-destructive focus:text-destructive">
              <LogOut className="h-4 w-4" />
              خروج از سیستم
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
