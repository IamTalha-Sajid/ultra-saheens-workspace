"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

export type PageCreator = {
  _id: string;
  name: string;
  email: string;
  username?: string;
};

export type PageListItem = {
  _id: string;
  title: string;
  icon: string;
  parentId: string | null;
  order: number;
  updatedAt: string;
  createdBy: PageCreator;
};

type PagesContextValue = {
  pages: PageListItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  createPage: (parentId?: string | null) => Promise<{ _id: string } | null>;
};

const PagesContext = createContext<PagesContextValue | null>(null);

export function PagesProvider({ children }: { children: ReactNode }) {
  const [pages, setPages] = useState<PageListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const res = await fetch("/api/pages");
      if (!res.ok) {
        if (res.status === 401) {
          setError("Sign in required");
          return;
        }
        throw new Error("Failed to load pages");
      }
      const data = (await res.json()) as { pages: PageListItem[] };
      setPages(data.pages ?? []);
    } catch {
      setError("Could not load pages");
    } finally {
      setLoading(false);
    }
  }, []);

  const createPage = useCallback(async (parentId: string | null = null) => {
    const res = await fetch("/api/pages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: "Untitled", parentId }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { page: { _id: string } };
    await refresh();
    return data.page;
  }, [refresh]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const value = useMemo(
    () => ({ pages, loading, error, refresh, createPage }),
    [pages, loading, error, refresh, createPage]
  );

  return (
    <PagesContext.Provider value={value}>{children}</PagesContext.Provider>
  );
}

export function usePages() {
  const ctx = useContext(PagesContext);
  if (!ctx) {
    throw new Error("usePages must be used within PagesProvider");
  }
  return ctx;
}
