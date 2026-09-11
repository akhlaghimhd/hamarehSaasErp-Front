"use client";

import { Bell, Search } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";

export function AppHeader() {
  return (
    <header className="flex h-14 items-center gap-4 border-b bg-background px-4">
      <div className="relative flex-1 max-w-md">
        <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pr-9" placeholder="جستجو در سیستم..." />
      </div>
      <div className="mr-auto flex items-center gap-2">
        <Button variant="ghost" size="icon" aria-label="اعلان‌ها">
          <Bell className="h-4 w-4" />
        </Button>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
          کا
        </div>
      </div>
    </header>
  );
}
