'use client';

import { useCallback, useEffect, useState } from 'react';
import { getApi } from '../api/api';
import { presetApiQuery, type PresetListParams } from './list-state';
import { presetsPageSchema, type PresetsPage } from './preset-types';

export function usePresetsList(params: PresetListParams) {
  const [data, setData] = useState<PresetsPage | null>(null);
  const [outcome, setOutcome] = useState<{
    key: string;
    failed: boolean;
  } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const key = `${presetApiQuery(params)}#${attempt}`;

  useEffect(() => {
    let current = true;
    const [query] = key.split('#');
    getApi()
      .request<unknown>(`/presets?${query}`)
      .then((body) => {
        if (!current) return;
        setData(presetsPageSchema.parse(body));
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
