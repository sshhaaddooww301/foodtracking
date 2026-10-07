/**
 * Auth store — Zustand-based auth state management.
 */
"use client";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { authApi } from "@/services/api";

export interface User {
  id: string;
  email: string;
  full_name: string;
  role: string;
  organization_id: string | null;
  organization: {
    id: string;
    name: string;
    org_type: string;
    city?: string;
  } | null;
  is_active: boolean;
  wallet_address?: string;
}

interface AuthState {
  user: User | null;
  access_token: string | null;
  refresh_token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  setUser: (user: User) => void;
  fetchCurrentUser: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      access_token: null,
      refresh_token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const res = await authApi.login(email, password);
          const { access_token, refresh_token, user } = res.data;
          localStorage.setItem("access_token", access_token);
          localStorage.setItem("refresh_token", refresh_token);
          set({ user, access_token, refresh_token, isAuthenticated: true, isLoading: false });
        } catch (err) {
          set({ isLoading: false });
          throw err;
        }
      },

      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, access_token: null, refresh_token: null, isAuthenticated: false });
        window.location.href = "/login";
      },

      setUser: (user) => set({ user }),

      fetchCurrentUser: async () => {
        try {
          const res = await authApi.me();
          set({ user: res.data, isAuthenticated: true });
        } catch {
          get().logout();
        }
      },
    }),
    {
      name: "trustchain-auth",
      partialize: (state) => ({
        access_token: state.access_token,
        refresh_token: state.refresh_token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// Role helpers
export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: "Platform Admin",
  MANUFACTURER: "Manufacturer",
  DISTRIBUTOR: "Distributor",
  WAREHOUSE: "Warehouse",
  LOGISTICS: "Logistics",
  RETAILER: "Retailer",
  AUDITOR: "Auditor",
};

export const useHasRole = (...roles: string[]) => {
  const user = useAuthStore((s) => s.user);
  return roles.includes(user?.role ?? "");
};

export const useIsAdmin = () => useHasRole("SUPER_ADMIN");
export const useIsManufacturer = () => useHasRole("SUPER_ADMIN", "MANUFACTURER");
