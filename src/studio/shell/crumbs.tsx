'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { BreadcrumbItem } from '../../shared/ui/breadcrumbs';

interface CrumbsContextValue {
  crumbs: BreadcrumbItem[];
  setCrumbs: (crumbs: BreadcrumbItem[]) => void;
}

const CrumbsContext = createContext<CrumbsContextValue | null>(null);

export function CrumbsProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState<BreadcrumbItem[]>([]);
  const value = useMemo(() => ({ crumbs, setCrumbs }), [crumbs]);
  return (
    <CrumbsContext.Provider value={value}>{children}</CrumbsContext.Provider>
  );
}

export function useCurrentCrumbs(): BreadcrumbItem[] {
  return useContext(CrumbsContext)?.crumbs ?? [];
}

export function useCrumbs(items: BreadcrumbItem[]) {
  const context = useContext(CrumbsContext);
  const setCrumbs = context?.setCrumbs;
  const key = JSON.stringify(items);

  useEffect(() => {
    if (!setCrumbs) return;
    setCrumbs(JSON.parse(key) as BreadcrumbItem[]);
    return () => setCrumbs([]);
  }, [key, setCrumbs]);
}
