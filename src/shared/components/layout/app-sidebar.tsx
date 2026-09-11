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
} from "lucide-react";
import { cn } from "@/shared/lib/utils";

const navItems = [
  { href: "/dashboard", label: "داشبورد", icon: LayoutDashboard },
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

  return (
    <aside className="sidebar-surface hidden w-64 shrink-0 border-l border-border/80 text-sidebar-foreground md:flex md:flex-col">
      <div className="flex h-14 items-center border-b border-border/80 px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
          <div className="brand-mark flex h-8 w-8 items-center justify-center rounded-lg text-sm text-white">
            ه
          </div>
          <span>هماره ERP</span>
        </Link>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-all duration-200",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium shadow-[var(--shadow-xs)]"
                  : "text-muted-foreground hover:bg-sidebar-accent/70 hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-border/80 p-3 text-xs text-muted-foreground">
        نسخه ۰.۱.۰ · فاز فرانت
      </div>
    </aside>
  );
}
