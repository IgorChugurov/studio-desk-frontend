'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A countdown that starts from seconds given by the server (invariant 7).
 * It measures elapsed time with the monotonic `performance.now()`, so a
 * change of the computer clock does not affect it.
 */
export function useCountdown() {
  const [remaining, setRemaining] = useState(0);
  const endsAt = useRef<number | null>(null);

  const start = useCallback((seconds: number) => {
    endsAt.current = performance.now() + seconds * 1000;
    setRemaining(Math.max(0, Math.ceil(seconds)));
  }, []);

  const stop = useCallback(() => {
    endsAt.current = null;
    setRemaining(0);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      if (endsAt.current === null) return;
      const left = Math.max(
        0,
        Math.ceil((endsAt.current - performance.now()) / 1000),
      );
      setRemaining(left);
      if (left === 0) endsAt.current = null;
    }, 250);
    return () => clearInterval(timer);
  }, []);

  return { remaining, start, stop };
}
