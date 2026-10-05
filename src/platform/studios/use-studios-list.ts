'use client';

import { useEffect, useState } from 'react';
import { getApi } from '../api/api';
import { apiQuery, type ListParams } from './list-state';
import { studiosPageSchema, type StudiosPage } from './studio-types';

export interface StudiosListState {
  /** The last loaded page; stays on screen while the next one loads. */
  data: StudiosPage | null;
  loading: boolean;
  failed: boolean;
}

/** Loads one page of studios; every change of the parameters loads again. */
export function useStudiosList(params: ListParams): StudiosListState {
  const [data, setData] = useState<StudiosPage | null>(null);
  const [outcome, setOutcome] = useState<{
    key: string;
    failed: boolean;
  } | null>(null);
  const key = apiQuery(params);

  useEffect(() => {
    let current = true;
    getApi()
      .request<unknown>(`/studios?${key}`)
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
  return { data, loading, failed: !loading && outcome.failed };
}
