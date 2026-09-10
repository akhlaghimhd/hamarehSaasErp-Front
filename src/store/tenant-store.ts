import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TenantState {
  tenantId: string | null;
  tenantName: string | null;
  setTenant: (tenantId: string, tenantName: string) => void;
  clearTenant: () => void;
}

export const useTenantStore = create<TenantState>()(
  persist(
    (set) => ({
      tenantId: null,
      tenantName: null,
      setTenant: (tenantId, tenantName) => set({ tenantId, tenantName }),
      clearTenant: () => set({ tenantId: null, tenantName: null }),
    }),
    {
      name: "hamareh-tenant",
    }
  )
);