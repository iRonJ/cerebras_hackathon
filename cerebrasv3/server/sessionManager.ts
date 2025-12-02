import crypto from 'node:crypto';
import type {
  BackgroundProcess,
  DesktopStatePayload,
  WidgetContent,
} from '../src/types';

export interface DesktopSession {
  id: string;
  widgets: Map<string, WidgetContent>;
  context: Map<string, string>;
  backgroundProcesses: Map<string, BackgroundProcess>;
}

const createSession = (id: string): DesktopSession => ({
  id,
  widgets: new Map(),
  context: new Map(),
  backgroundProcesses: new Map(),
});

const generateSessionId = () =>
  `session_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

export class DesktopSessionManager {
  private readonly sessions = new Map<string, DesktopSession>();

  getOrCreate(sessionId?: string): DesktopSession {
    const id = sessionId?.trim() || generateSessionId();
    let session = this.sessions.get(id);
    if (!session) {
      session = createSession(id);
      this.sessions.set(id, session);
    }
    return session;
  }

  tryGet(sessionId: string): DesktopSession | undefined {
    return this.sessions.get(sessionId);
  }

  remove(sessionId: string): void {
    this.sessions.delete(sessionId);
  }

  mergeContext(
    session: DesktopSession,
    snapshot?: Record<string, string | undefined>,
  ): void {
    if (!snapshot) return;
    Object.entries(snapshot).forEach(([key, value]) => {
      if (!key || value == null || value === '') return;
      session.context.set(key, value);
    });
  }

  upsertWidget(session: DesktopSession, widget: WidgetContent): WidgetContent {
    const hydrated = {
      ...widget,
      lastUpdated: widget.lastUpdated ?? Date.now(),
    };
    session.widgets.set(widget.id, hydrated);
    return hydrated;
  }

  removeWidget(
    session: DesktopSession,
    widgetId: string,
  ): WidgetContent | undefined {
    const removed = session.widgets.get(widgetId);
    if (!removed) return undefined;
    session.widgets.delete(widgetId);
    if (removed.contextKey) {
      session.context.delete(removed.contextKey);
      session.backgroundProcesses.delete(removed.contextKey);
    }

    session.backgroundProcesses.delete(widgetId);
    return removed;
  }

  buildState(session: DesktopSession, notice?: string): DesktopStatePayload {
    return {
      sessionId: session.id,
      widgets: Array.from(session.widgets.values()).sort(
        (a, b) => (b.lastUpdated ?? 0) - (a.lastUpdated ?? 0),
      ),
      context: Object.fromEntries(session.context.entries()),
      backgroundProcesses: Array.from(session.backgroundProcesses.values()),
      notice,
    };
  }
}
