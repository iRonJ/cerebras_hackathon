export type DesktopIntent =
  | 'create_widget'
  | 'close_widget'
  | 'context_sync'
  | 'hydrate_widget';

export interface DesktopCommandPayload {
  sessionId: string;
  intent: DesktopIntent;
  prompt?: string;
  widgetId?: string;
  contextSnapshot?: Record<string, string>;
  targetWidgetId?: string;
}

export interface WidgetContent {
  id: string;
  prompt: string;
  html: string;
  liveData: boolean;
  explanation?: string;
  contextKey?: string;
  lastUpdated?: number;
  scripts?: string[];
  title?: string;
  width?: number;
  height?: number;
}

export interface WidgetInstance extends WidgetContent {
  position: { x: number; y: number };
  size: { width: number; height: number };
  origin?: 'ai' | 'context';
  rawContextValue?: string;
  zIndex?: number;
}

export interface BackgroundProcess {
  key: string;
  prompt: string;
  status: 'pending' | 'running' | 'ready' | 'error';
  lastRun?: number;
  message?: string;
}

export interface DesktopStatePayload {
  sessionId: string;
  widgets: WidgetContent[];
  context: Record<string, string>;
  backgroundProcesses: BackgroundProcess[];
  notice?: string;
}
