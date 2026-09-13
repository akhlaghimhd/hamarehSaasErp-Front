"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { useState } from "react";
import { TenantProvider } from "@/auth";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
          },
        },
      })
  );

  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
      <QueryClientProvider client={queryClient}>
        <TenantProvider>
          {children}
          <Toaster
            richColors
            position="top-center"
            dir="rtl"
            closeButton
            toastOptions={{
              classNames: {
                toast:
                  "font-sans !font-[family-name:var(--font-vazirmatn)] text-sm shadow-[var(--shadow-md)] border border-border/70",
                title: "font-medium",
                description: "text-xs opacity-90",
              },
              style: {
                fontFamily: "var(--font-vazirmatn), Tahoma, sans-serif",
              },
            }}
          />
        </TenantProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}
