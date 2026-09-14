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
  BookOpen,
  ChevronsLeft,
  ChevronsRight,
  X,
  Shield,
} from "lucide-react";
import { cn } from "@/shared/lib/utils";
import { useSidebar } from "@/shared/components/layout/sidebar-context";
import { Button } from "@/shared/components/ui/button";

const navItems = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
  { href: "/dashboard/identity", label: "هویت و دسترسی", icon: Shield },
  { href: "/dashboard/organization", label: "سازمان", icon: Building2 },
  { href: "/dashboard/ui-guide", label: "راهنمای UI", icon: BookOpen },
  { href: "/dashboard/showcase", label: "نمایشگاه UI", icon: Component },
  { href: "/themes", label: "پالت رنگ", icon: Palette },
  { href: "/dashboard/inventory", label: "انبار و کالا", icon: Warehouse },
  { href: "/dashboard/sales", label: "خرید و فروش", icon: ShoppingCart },
  { href: "/dashboard/items", label: "کالاها", icon: Package },
  { href: "/dashboard/users", label: "کاربران", icon: Users },
  { href: "/dashboard/settings", label: "تنظیمات", icon: Settings },
];

function NavList({
  onNavigate,
  collapsed,
}: {
  onNavigate?: () => void;
  collapsed?: boolean;
}) {
  const pathname = usePathname();

  return (
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
            onClick={onNavigate}
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
  );
}

export function AppSidebar() {
  const { collapsed, toggle, mobileOpen, setMobileOpen } = useSidebar();

  return (
    <>
      {/* Desktop */}
      <aside
        className={cn(
          "sidebar-surface relative hidden shrink-0 border-l border-border/70 text-sidebar-foreground transition-[width] duration-200 md:flex md:flex-col",
          collapsed ? "w-[68px]" : "w-60"
        )}
      >
        <div
          className={cn(
            "flex h-12 items-center border-b border-border/70 px-2",
            collapsed ? "justify-center" : "justify-between gap-1 px-3"
          )}
        >
          {!collapsed && (
            <Link href="/dashboard" className="flex min-w-0 items-center gap-2 font-semibold">
              <div className="brand-mark flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm text-white">
                ه
              </div>
              <span className="truncate text-sm">هماره ERP</span>
            </Link>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 shrink-0"
            onClick={toggle}
            title={collapsed ? "باز کردن منو" : "جمع کردن منو"}
            aria-label={collapsed ? "باز کردن منو" : "جمع کردن منو"}
          >
            {collapsed ? <ChevronsLeft className="h-4 w-4" /> : <ChevronsRight className="h-4 w-4" />}
          </Button>
        </div>

        {collapsed && (
          <Link
            href="/dashboard"
            title="هماره ERP"
            className="mb-1 flex items-center justify-center rounded-lg py-2"
          >
            <div className="brand-mark flex h-8 w-8 items-center justify-center rounded-lg text-sm text-white">ه</div>
          </Link>
        )}

        <NavList collapsed={collapsed} />

        {!collapsed && (
          <div className="border-t border-border/70 p-3 text-[11px] text-muted-foreground">
            نسخه ۰.۱.۰ · فاز فرانت
          </div>
        )}
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="بستن منو"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="sidebar-surface absolute inset-y-0 end-0 flex w-64 max-w-[85vw] flex-col border-s border-border/70 shadow-[var(--shadow-md)]">
            <div className="flex h-12 items-center justify-between border-b border-border/70 px-3">
              <Link
                href="/dashboard"
                className="flex items-center gap-2 font-semibold"
                onClick={() => setMobileOpen(false)}
              >
                <div className="brand-mark flex h-8 w-8 items-center justify-center rounded-lg text-sm text-white">
                  ه
                </div>
                <span className="text-sm">هماره ERP</span>
              </Link>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => setMobileOpen(false)}
                aria-label="بستن منو"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <NavList onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}
    </>
  );
}
