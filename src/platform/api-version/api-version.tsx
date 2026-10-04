'use client';

import { useEffect, useState } from 'react';
import { loadPublicEnv } from '../../shared/config/public-env';
import { fetchApiVersion } from './fetch-api-version';

type State =
  | { status: 'loading' }
  | { status: 'ok'; version: string }
  | { status: 'error'; message: string };

/** Connection check: shows the version the platform API reports. */
export function ApiVersion() {
  const { apiUrl } = loadPublicEnv();
  const [state, setState] = useState<State>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    fetchApiVersion(apiUrl)
      .then((info) => {
        if (active) setState({ status: 'ok', version: info.version });
      })
      .catch((error: unknown) => {
        if (active) {
          setState({
            status: 'error',
            message: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      });
    return () => {
      active = false;
    };
  }, [apiUrl]);

  return (
    <section>
      <p>API: {apiUrl}</p>
      {state.status === 'loading' && <p>Checking the API…</p>}
      {state.status === 'ok' && <p>API version: {state.version}</p>}
      {state.status === 'error' && <p>Cannot reach the API: {state.message}</p>}
    </section>
  );
}
