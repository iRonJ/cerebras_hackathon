import { useCallback, useEffect, useRef, useState } from 'react';
import './App.css';
import { DesktopStage } from './components/DesktopStage';
import { DesktopHeader } from './components/DesktopHeader';
import { BackgroundStatus } from './components/BackgroundStatus';
import { usePersistentContext } from './hooks/usePersistentContext';
import { sendDesktopCommand } from './services/aiClient';
import type {
  BackgroundProcess,
  DesktopIntent,
  DesktopStatePayload,
  WidgetInstance,
} from './types';
import { generateLayout } from './utils/layout';
import {
  normalizeWidgetPayload,
  createWidgetInstance,
  renderContextHtml,
} from './utils/widgetTransforms';

type CommandInput = {
  intent: DesktopIntent;
  prompt?: string;
  widgetId?: string;
  contextSnapshot?: Record<string, string>;
};

type CommandOptions = {
  silent?: boolean;
};

export default function App() {
  const { sessionId, context, syncContext } = usePersistentContext();
  const contextRef = useRef(context);
  const widgetsRef = useRef<WidgetInstance[]>([]);
  const dismissedContextRef = useRef<Record<string, string>>({});
  const zIndexRef = useRef(1);
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [backgroundProcesses, setBackgroundProcesses] = useState<BackgroundProcess[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [promptInput, setPromptInput] = useState('');
  const layoutCursor = useRef(0);

  useEffect(() => {
    contextRef.current = context;
  }, [context]);

  useEffect(() => {
    widgetsRef.current = widgets;
  }, [widgets]);

  const applyPayload = useCallback(
    (payload: DesktopStatePayload) => {
      setNotice(payload.notice ?? null);
      syncContext(payload.context ?? {});
      setBackgroundProcesses(payload.backgroundProcesses ?? []);
      setWidgets((previous) => {
        const previousMap = new Map(previous.map((widget) => [widget.id, widget]));
        const normalizedWidgets = (payload.widgets ?? []).map(normalizeWidgetPayload);
        const next: WidgetInstance[] = normalizedWidgets.map((widget) =>
          createWidgetInstance(widget, zIndexRef, layoutCursor, previousMap.get(widget.id)),
        );

        const contextEntries = payload.context ?? {};
        Object.entries(contextEntries).forEach(([key, value]) => {
          if (
            value &&
            dismissedContextRef.current[key] &&
            dismissedContextRef.current[key] !== value
          ) {
            delete dismissedContextRef.current[key];
          }
        });

        const claimedContextKeys = new Set(
          (payload.widgets ?? [])
            .map((widget) => widget.contextKey)
            .filter((key): key is string => Boolean(key)),
        );

        const contextWidgets: WidgetInstance[] = Object.entries(contextEntries)
          .filter(([key, value]) => {
            if (!value) return false;
            if (claimedContextKeys.has(key)) return false;
            return dismissedContextRef.current[key] !== value;
          })
          .map(([key, value]) => {
            const widgetId = `context_${key}`;
            const existing = previousMap.get(widgetId);
            const html = renderContextHtml(key, value);
            if (existing) {
              return {
                ...existing,
                html,
                rawContextValue: value,
                lastUpdated: Date.now(),
                origin: 'context',
                zIndex: existing.zIndex ?? ++zIndexRef.current,
              };
            }
            const layout = generateLayout(layoutCursor.current);
            layoutCursor.current += 1;
            return {
              id: widgetId,
              prompt: key,
              html,
              liveData: false,
              explanation: 'Synced context entry',
              contextKey: key,
              lastUpdated: Date.now(),
              origin: 'context',
              rawContextValue: value,
              position: layout.position,
              size: layout.size,
              zIndex: ++zIndexRef.current,
            };
          });

        return [...next, ...contextWidgets];
      });
    },
    [syncContext],
  );

  const dispatchCommand = useCallback(
    async (command: CommandInput, options: CommandOptions = {}) => {
      if (!sessionId) {
        return;
      }

      if (!options.silent) {
        setBusy(true);
        setError(null);
      }

      try {
        const payload = await sendDesktopCommand({
          sessionId,
          ...command,
          contextSnapshot: command.contextSnapshot ?? contextRef.current,
        });
        applyPayload(payload);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : 'Unable to complete desktop request.';
        if (!options.silent) {
          setError(message);
        } else {
          console.error(message);
        }
      } finally {
        if (!options.silent) {
          setBusy(false);
        }
      }
    },
    [applyPayload, sessionId],
  );

  useEffect(() => {
    dispatchCommand({ intent: 'hydrate_widget' }, { silent: true });
  }, [dispatchCommand]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      dispatchCommand({ intent: 'context_sync' }, { silent: true });
    }, 12000);
    return () => window.clearInterval(interval);
  }, [dispatchCommand]);

  const handleSubmitPrompt = useCallback(
    (prompt: string) => {
      dispatchCommand({ intent: 'create_widget', prompt });
    },
    [dispatchCommand],
  );

  const handleCloseWidget = useCallback(
    (id: string) => {
      const target = widgetsRef.current.find((widget) => widget.id === id);
      if (target?.origin === 'context' && target.contextKey) {
        dismissedContextRef.current[target.contextKey] =
          target.rawContextValue ?? '';
        setWidgets((current) => current.filter((widget) => widget.id !== id));
        return;
      }
      dispatchCommand({ intent: 'close_widget', widgetId: id });
    },
    [dispatchCommand],
  );

  const handleFocusWidget = useCallback((id: string) => {
    setWidgets((current) =>
      current.map((widget) =>
        widget.id === id
          ? { ...widget, zIndex: ++zIndexRef.current }
          : widget,
      ),
    );
  }, []);

  const handleMoveWidget = useCallback((id: string, position: { x: number; y: number }) => {
    setWidgets((current) =>
      current.map((widget) => (widget.id === id ? { ...widget, position } : widget)),
    );
  }, []);

  const handleResizeWidget = useCallback(
    (id: string, size: { width: number; height: number }) => {
      setWidgets((current) =>
        current.map((widget) => (widget.id === id ? { ...widget, size } : widget)),
      );
    },
    [],
  );

  const sessionSuffix = sessionId ? sessionId.slice(-6) : 'pending';
  const contextCount = Object.keys(context).length;

  const handlePromptSubmit = () => {
    const text = promptInput.trim();
    if (!text || busy) return;
    handleSubmitPrompt(text);
    setPromptInput('');
  };

  return (
    <div className="desktop-shell">
      <DesktopHeader
        sessionSuffix={sessionSuffix}
        contextCount={contextCount}
        busy={busy}
        promptInput={promptInput}
        onPromptChange={setPromptInput}
        onSubmit={handlePromptSubmit}
      />

      {notice ? <div className="notice-banner">{notice}</div> : null}
      {error ? <div className="notice-banner notice-error">{error}</div> : null}

      <main className="desktop-main">
        <DesktopStage
          widgets={widgets}
          onCloseWidget={handleCloseWidget}
          onMoveWidget={handleMoveWidget}
          onResizeWidget={handleResizeWidget}
          onFocusWidget={handleFocusWidget}
        />
        <BackgroundStatus processes={backgroundProcesses} />
      </main>
    </div>
  );
}
