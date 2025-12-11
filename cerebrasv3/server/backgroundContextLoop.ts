import type { WidgetContent } from '../src/types';
import type { DesktopModelProvider } from './providers/shared';
import {
  DesktopSessionManager,
  type DesktopSession,
} from './sessionManager';

type BackgroundTask = {
  key: string;
  sessionId: string;
  widgetId: string;
  prompt: string;
  running: boolean;
  nextRun: number;
};

const DEFAULT_INTERVAL = 15000;

export class BackgroundContextLoop {
  private timer?: NodeJS.Timeout;
  private readonly tasks = new Map<string, BackgroundTask>();

  constructor(
    private readonly provider: DesktopModelProvider,
    private readonly sessions: DesktopSessionManager,
    private readonly intervalMs: number = DEFAULT_INTERVAL,
  ) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);
  }

  stop(): void {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = undefined;
  }

  trackLiveWidget(sessionId: string, widget: WidgetContent): void {
    if (!widget.liveData) return;
    const key = `${sessionId}:${widget.contextKey ?? widget.id}`;
    this.tasks.set(key, {
      key,
      sessionId,
      widgetId: widget.id,
      prompt: widget.prompt,
      running: false,
      nextRun: Date.now(),
    });

    const session = this.sessions.getOrCreate(sessionId);
    session.backgroundProcesses.set(widget.contextKey ?? widget.id, {
      key: widget.contextKey ?? widget.id,
      prompt: widget.prompt,
      status: 'pending',
    });
  }

  removeWidget(
    sessionId: string,
    widgetId: string,
    contextKey?: string,
  ): void {
    for (const [key, task] of this.tasks.entries()) {
      if (task.sessionId === sessionId && task.widgetId === widgetId) {
        this.tasks.delete(key);
      }
    }
    const session = this.sessions.tryGet(sessionId);
    if (!session) return;
    session.backgroundProcesses.delete(widgetId);
    if (contextKey) {
      session.backgroundProcesses.delete(contextKey);
    }
  }

  private async tick(): Promise<void> {
    for (const task of this.tasks.values()) {
      if (task.running || Date.now() < task.nextRun) {
        continue;
      }
      const session = this.sessions.tryGet(task.sessionId);
      if (!session) {
        this.tasks.delete(task.key);
        continue;
      }

      const widget = session.widgets.get(task.widgetId);
      if (!widget || !widget.liveData) {
        this.tasks.delete(task.key);
        continue;
      }

      await this.refreshWidget(session, widget, task);
    }
  }

  private async refreshWidget(
    session: DesktopSession,
    widget: WidgetContent,
    task: BackgroundTask,
  ): Promise<void> {
    task.running = true;
    const processKey = widget.contextKey ?? widget.id;
    const existingProcess = session.backgroundProcesses.get(processKey);
    session.backgroundProcesses.set(processKey, {
      key: processKey,
      prompt: widget.prompt,
      status: 'running',
      lastRun: existingProcess?.lastRun,
      message: existingProcess?.message,
    });

    try {
      const contextSnapshot = Object.fromEntries(session.context.entries());
      if (widget.html) {
        contextSnapshot['CURRENT_WIDGET_HTML'] = widget.html;
      }
      const llm = await this.provider.generateWidget(
        widget.prompt,
        contextSnapshot,
      );

      if (llm.HTMLText) {
        widget.html = llm.HTMLText;
      }
      if (llm.prompt) {
        widget.prompt = llm.prompt;
      }
      if (llm.LLMExplanation) {
        widget.explanation = llm.LLMExplanation;
      }
      widget.lastUpdated = Date.now();

      session.backgroundProcesses.set(processKey, {
        key: processKey,
        prompt: widget.prompt,
        status: 'ready',
        lastRun: widget.lastUpdated,
      });

      if (llm.contextKey && processKey !== llm.contextKey) {
        session.context.set(llm.contextKey, widget.html ?? widget.prompt);
        widget.contextKey = llm.contextKey;
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Background refresh failed';
      session.backgroundProcesses.set(processKey, {
        key: processKey,
        prompt: widget.prompt,
        status: 'error',
        message,
        lastRun: Date.now(),
      });
    } finally {
      task.running = false;
      task.nextRun = Date.now() + this.intervalMs;
    }
  }
}
