"use client";

import { createContext, useContext, useEffect, useState } from "react";

type SidebarContextValue = {
  collapsed: boolean;
  mobileOpen: boolean;
  toggle: () => void;
  setCollapsed: (value: boolean) => void;
  setMobileOpen: (value: boolean) => void;
  toggleMobile: () => void;
};

const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem("hamareh-sidebar-collapsed");
    if (saved === "1") setCollapsed(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem("hamareh-sidebar-collapsed", collapsed ? "1" : "0");
  }, [collapsed]);

  return (
    <SidebarContext.Provider
      value={{
        collapsed,
        mobileOpen,
        setCollapsed,
        setMobileOpen,
        toggle: () => setCollapsed((v) => !v),
        toggleMobile: () => setMobileOpen((v) => !v),
      }}
    >
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const ctx = useContext(SidebarContext);
  if (!ctx) throw new Error("useSidebar must be used within SidebarProvider");
  return ctx;
}
