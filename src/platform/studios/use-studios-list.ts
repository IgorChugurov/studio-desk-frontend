'use client';

import { useCallback, useEffect, useState } from 'react';
import { getApi } from '../api/api';
import { apiQuery, type ListParams } from './list-state';
import { studiosPageSchema, type StudiosPage } from './studio-types';

export interface StudiosListState {
  /** The last loaded page; stays on screen while the next one loads. */
  data: StudiosPage | null;
  loading: boolean;
  failed: boolean;
  /** Loads the same page again, e.g. after an action changed a studio. */
  reload: () => void;
}

/** Loads one page of studios; every change of the parameters loads again. */
export function useStudiosList(params: ListParams): StudiosListState {
  const [data, setData] = useState<StudiosPage | null>(null);
  const [outcome, setOutcome] = useState<{
    key: string;
    failed: boolean;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${apiQuery(params)}#${attempt}`;

  useEffect(() => {
    let current = true;
    const [query] = key.split('#');
    getApi()
      .request<unknown>(`/studios?${query}`)
      .then((body) => {
        if (!current) return;
        setData(studiosPageSchema.parse(body));
        setOutcome({ key, failed: false });
      })
      .catch(() => {
        if (current) setOutcome({ key, failed: true });
      });
    return () => {
      current = false;
    };
  }, [key]);

  const loading = outcome?.key !== key;
  const reload = useCallback(() => setAttempt((value) => value + 1), []);
  return { data, loading, failed: !loading && outcome.failed, reload };
}
