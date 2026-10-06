"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Package, LogOut, Shield } from "lucide-react";
import { AdminGuard } from "@/modules/saas-admin/components/admin-guard";
import { adminAuthService } from "@/modules/saas-admin/services/admin-api";
import { adminTokenStorage } from "@/modules/saas-admin/lib/admin-token-storage";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";

const nav = [{ href: "/admin/feature-packs", label: "بسته‌های قابلیت", icon: Package }];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const isLogin = pathname === "/admin/login";
  const user = adminTokenStorage.getUser();

  async function logout() {
    await adminAuthService.logout();
    router.replace("/admin/login");
  }

  if (isLogin) {
    return <>{children}</>;
  }

  return (
    <AdminGuard>
      <div className="flex min-h-screen w-full">
        <aside className="hidden w-56 shrink-0 border-e bg-card md:flex md:flex-col">
          <div className="flex h-12 items-center gap-2 border-b px-3 font-semibold">
            <Shield className="h-4 w-4 text-primary" />
            <span className="text-sm">ادمین پلتفرم</span>
          </div>
          <nav className="flex-1 space-y-0.5 p-2">
            {nav.map((item) => {
              const active =
                pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm transition",
                    active
                      ? "bg-primary/10 font-medium text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="border-t p-2">
            <div className="mb-2 truncate px-2 text-[11px] text-muted-foreground" dir="ltr">
              {user?.username || user?.email || "admin"}
            </div>
            <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => void logout()}>
              <LogOut className="me-2 h-4 w-4" />
              خروج
            </Button>
          </div>
        </aside>
        <main className="min-w-0 flex-1 p-4 md:p-6">{children}</main>
      </div>
    </AdminGuard>
  );
}
