import { useCallback, useMemo, useState } from 'react';

const randomId = () =>
  crypto.randomUUID
    ? crypto.randomUUID()
    : `session_${Math.random().toString(36).slice(2, 9)}`;

export function usePersistentContext() {
  const sessionId = useMemo(() => randomId(), []);
  const [context, setContext] = useState<Record<string, string>>({});

  const syncContext = useCallback((incoming: Record<string, string>) => {
    setContext((current) => {
      const merged = { ...current };
      Object.entries(incoming).forEach(([key, value]) => {
        if (value === undefined || value === null) return;
        merged[key] = value;
      });
      return merged;
    });
  }, []);

  const resetContext = useCallback(() => setContext({}), []);

  return {
    sessionId,
    context,
    syncContext,
    resetContext,
  };
}
