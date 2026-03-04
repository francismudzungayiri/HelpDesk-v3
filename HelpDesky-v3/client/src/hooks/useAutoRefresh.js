import { useEffect, useRef } from 'react';

const useAutoRefresh = (callback, intervalMs, options = {}) => {
  const {
    enabled = true,
    refreshOnFocus = true,
    visibleOnly = true
  } = options;

  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !intervalMs || intervalMs <= 0) return undefined;

    const tick = () => {
      if (visibleOnly && typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      callbackRef.current?.();
    };

    const intervalId = window.setInterval(tick, intervalMs);
    return () => window.clearInterval(intervalId);
  }, [enabled, intervalMs, visibleOnly]);

  useEffect(() => {
    if (!enabled || !refreshOnFocus) return undefined;

    const onFocus = () => callbackRef.current?.();
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        callbackRef.current?.();
      }
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, refreshOnFocus]);
};

export default useAutoRefresh;
