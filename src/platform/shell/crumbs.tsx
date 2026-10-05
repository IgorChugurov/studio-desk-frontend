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

/** Holds the breadcrumbs that the current page reports to the navbar. */
export function CrumbsProvider({ children }: { children: ReactNode }) {
  const [crumbs, setCrumbs] = useState<BreadcrumbItem[]>([]);
  const value = useMemo(() => ({ crumbs, setCrumbs }), [crumbs]);
  return (
    <CrumbsContext.Provider value={value}>{children}</CrumbsContext.Provider>
  );
}

export function useCurrentCrumbs(): BreadcrumbItem[] {
  const context = useContext(CrumbsContext);
  if (!context) throw new Error('CrumbsProvider is missing');
  return context.crumbs;
}

/** A page calls this to say where it is: the levels above and the page itself. */
export function useCrumbs(items: BreadcrumbItem[]) {
  const context = useContext(CrumbsContext);
  if (!context) throw new Error('CrumbsProvider is missing');
  const { setCrumbs } = context;
  const key = JSON.stringify(items);

  useEffect(() => {
    setCrumbs(JSON.parse(key) as BreadcrumbItem[]);
    return () => setCrumbs([]);
  }, [key, setCrumbs]);
}
