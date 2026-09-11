"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Warehouse,
  Users,
  Settings,
  Building2,
  Palette,
  Component,
  PanelRightClose,
  PanelRightOpen,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useSidebar } from "@/shared/components/layout/sidebar-context";
import { Button } from "@/shared/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
  { href: "/dashboard/showcase", label: "نمایشگاه UI", icon: Component },
  { href: "/themes", label: "پالت رنگ", icon: Palette },
  { href: "/dashboard/organization", label: "سازمان", icon: Building2 },
  { href: "/dashboard/inventory", label: "انبار و کالا", icon: Warehouse },
  { href: "/dashboard/sales", label: "خرید و فروش", icon: ShoppingCart },
  { href: "/dashboard/items", label: "کالاها", icon: Package },
  { href: "/dashboard/users", label: "کاربران", icon: Users },
  { href: "/dashboard/settings", label: "تنظیمات", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();

  return (
    <aside
      className={cn(
        "sidebar-surface relative hidden shrink-0 border-l border-border/70 text-sidebar-foreground transition-[width] duration-200 md:flex md:flex-col",
        collapsed ? "w-[68px]" : "w-60"
      )}
    >
      {/* Header: only brand — toggle moved to bottom to avoid overlap */}
      <div
        className={cn(
          "flex h-12 items-center border-b border-border/70 px-3",
          collapsed ? "justify-center" : "justify-start gap-2"
        )}
      >
        <Link href="/dashboard" className="flex min-w-0 items-center gap-2 font-semibold" title="هماره ERP">
          <div className="brand-mark flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm text-white">
            ه
          </div>
          {!collapsed && <span className="truncate text-sm">هماره ERP</span>}
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-2">
        {navItems.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              className={cn(
                "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-all duration-150",
                collapsed && "justify-center px-0",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[var(--shadow-xs)]"
                  : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Collapse control always at bottom — never overlaps logo */}
      <div className="border-t border-border/70 p-2">
        <Button
          variant="ghost"
          onClick={toggle}
          className={cn(
            "h-9 w-full text-xs text-muted-foreground hover:text-foreground",
            collapsed ? "px-0" : "justify-start gap-2"
          )}
          aria-label={collapsed ? "باز کردن منو" : "جمع کردن منو"}
          title={collapsed ? "باز کردن منو" : "جمع کردن منو"}
        >
          {collapsed ? (
            <PanelRightOpen className="h-4 w-4" />
          ) : (
            <>
              <PanelRightClose className="h-4 w-4" />
              <span>جمع کردن منو</span>
            </>
          )}
        </Button>
        {!collapsed && (
          <div className="px-2 pb-1 text-[11px] text-muted-foreground">نسخه ۰.۱.۰ · فاز فرانت</div>
        )}
      </div>
    </aside>
  );
}
