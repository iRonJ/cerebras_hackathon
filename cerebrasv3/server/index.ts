import cors from 'cors';
import dotenv from 'dotenv';
import express, { type Request, type Response } from 'express';
import crypto from 'node:crypto';
import type {
  DesktopCommandPayload,
  DesktopStatePayload,
  WidgetContent,
} from './types';
import { BackgroundContextLoop } from './backgroundContextLoop';
import { DesktopSessionManager } from './sessionManager';
import {
  createModelProvider,
} from './providers';
import type { WidgetLLMResponse } from './providers/shared';

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));
const apiRouter = express.Router();

const sessionManager = new DesktopSessionManager();
const modelProvider = createModelProvider();
console.log(`[desktop-ai] Using ${modelProvider.name} provider`);
const backgroundLoop = new BackgroundContextLoop(
  modelProvider,
  sessionManager,
);
backgroundLoop.start();

const port = Number(process.env.DESKTOP_API_PORT) || 4000;

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', time: Date.now() });
});

apiRouter.post('/desktop', async (req: Request, res: Response) => {
  const payload = req.body as DesktopCommandPayload | undefined;
  if (!payload?.sessionId) {
    res.status(400).json({ error: 'sessionId is required' });
    return;
  }

  try {
    const session = sessionManager.getOrCreate(payload.sessionId);
    const response = await handleIntent(session, payload);
    res.json(response);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Desktop command failed';
    console.error('[desktop-api]', message);
    res.status(500).json({ error: message });
  }
});

apiRouter.use(async (req: Request, res: Response) => {
  const sessionId = resolveSessionId(req);
  if (!sessionId) {
    res.status(400).json({
      error:
        'sessionId is required (set body.sessionId, query ?sessionId=, or X-Session-Id header)',
    });
    return;
  }

  try {
    const session = sessionManager.getOrCreate(sessionId);
    const prompt = buildPromptFromRequest(req);
    const contextSnapshot =
      typeof req.body === 'object' && req.body !== null
        ? (req.body as Record<string, unknown>).contextSnapshot
        : undefined;

    const payload = await handleCreateWidget(session, {
      sessionId,
      intent: 'create_widget',
      prompt,
      contextSnapshot: contextSnapshot as Record<string, string> | undefined,
    });
    res.json(payload);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : 'Failed to route API call through AI dispatcher';
    console.error('[desktop-api:gateway]', message);
    res.status(500).json({ error: message });
  }
});

app.use('/api', apiRouter);

app.listen(port, () => {
  console.log(`Desktop AI API listening on http://localhost:${port}`);
});

async function handleIntent(
  session: ReturnType<DesktopSessionManager['getOrCreate']>,
  command: DesktopCommandPayload,
): Promise<DesktopStatePayload> {
  switch (command.intent) {
    case 'hydrate_widget':
      return sessionManager.buildState(session);
    case 'context_sync':
      sessionManager.mergeContext(session, command.contextSnapshot);
      return sessionManager.buildState(session);
    case 'close_widget':
      if (!command.widgetId) {
        throw new Error('widgetId is required to close a widget');
      }
      {
        const removed = sessionManager.removeWidget(session, command.widgetId);
        backgroundLoop.removeWidget(
          session.id,
          command.widgetId,
          removed?.contextKey,
        );
      }
      return sessionManager.buildState(session);
    case 'create_widget':
      if (!command.prompt) {
        throw new Error('prompt is required to create a widget');
      }
      return handleCreateWidget(session, command);
    default:
      return assertNever(command.intent);
  }
}

async function handleCreateWidget(
  session: ReturnType<DesktopSessionManager['getOrCreate']>,
  command: DesktopCommandPayload,
): Promise<DesktopStatePayload> {
  sessionManager.mergeContext(session, command.contextSnapshot);
  const contextSnapshot = {
    ...Object.fromEntries(session.context.entries()),
    ...(command.contextSnapshot ?? {}),
  };

  const llm = await modelProvider.generateWidget(
    command.prompt ?? '',
    contextSnapshot,
  );

  const widget = composeWidget(
    llm,
    command.prompt ?? 'Untitled widget',
  );

  sessionManager.upsertWidget(session, widget);
  if (widget.contextKey) {
    session.context.set(widget.contextKey, widget.prompt);
  }
  if (widget.liveData) {
    backgroundLoop.trackLiveWidget(session.id, widget);
  }

  const notice =
    typeof llm.notice === 'string' && llm.notice.length > 0
      ? llm.notice
      : undefined;
  return sessionManager.buildState(session, notice);
}

function composeWidget(
  llm: WidgetLLMResponse,
  fallbackPrompt: string,
): WidgetContent {
  const html = typeof llm.HTMLText === 'string' ? llm.HTMLText : '';
  const prompt =
    typeof llm.prompt === 'string' && llm.prompt.length > 0
      ? llm.prompt
      : fallbackPrompt;
  const liveData = Boolean(llm.liveData);
  const explanation =
    typeof llm.LLMExplanation === 'string' ? llm.LLMExplanation : undefined;
  const contextKey =
    typeof llm.contextKey === 'string' ? llm.contextKey : undefined;

  return {
    id: `widget_${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`,
    prompt,
    html: html || `<div class="empty-state">No HTML returned.</div>`,
    liveData,
    explanation,
    contextKey,
    lastUpdated: Date.now(),
    title: prompt,
    width: 400,
    height: 300,
  };
}

function assertNever(value: never): never {
  throw new Error(`Unhandled intent: ${value}`);
}

function resolveSessionId(req: Request): string | undefined {
  const header = req.header('x-session-id');
  const queryId =
    typeof req.query.sessionId === 'string' ? req.query.sessionId : undefined;
  const bodyId =
    typeof (req.body as { sessionId?: unknown })?.sessionId === 'string'
      ? (req.body as { sessionId: string }).sessionId
      : undefined;
  return header ?? queryId ?? bodyId;
}

function buildPromptFromRequest(req: Request): string {
  const lines = [
    'Handle the following HTTP request and produce a single desktop widget response:',
    `Method: ${req.method}`,
    `Path: ${req.originalUrl}`,
  ];
  if (Object.keys(req.query).length > 0) {
    lines.push(`Query: ${JSON.stringify(req.query)}`);
  }
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length) {
    lines.push(`Body: ${JSON.stringify(req.body)}`);
  }
  lines.push(
    'Return JSON using the widget schema (HTMLText, prompt, liveData, LLMExplanation, contextKey, notice).',
  );
  return lines.join('\n');
}
