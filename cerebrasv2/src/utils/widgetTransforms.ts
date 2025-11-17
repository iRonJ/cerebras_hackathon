import type { WidgetContent, WidgetInstance } from '../types';
import { generateLayout } from './layout';

export function normalizeWidgetPayload(widget: WidgetContent): WidgetContent {
  if (!widget.html) return widget;
  const { html, scripts } = extractScripts(widget.html);
  return {
    ...widget,
    html,
    scripts,
  };
}

export function extractScripts(html: string): { html: string; scripts: string[] } {
  const scripts: string[] = [];
  const cleaned = html.replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gi, (_, code) => {
    if (code && code.trim()) {
      scripts.push(code.trim());
    }
    return '';
  });
  return { html: cleaned, scripts };
}

export function createWidgetInstance(
  widget: WidgetContent,
  zIndexRef: React.MutableRefObject<number>,
  layoutCursor: React.MutableRefObject<number>,
  existing?: WidgetInstance,
): WidgetInstance {
  if (existing) {
    return {
      ...existing,
      ...widget,
      origin: existing.origin ?? 'ai',
      zIndex: existing.zIndex ?? existing.lastUpdated ?? 1,
    };
  }
  const layout = generateLayout(layoutCursor.current);
  layoutCursor.current += 1;
  return {
    ...widget,
    position: layout.position,
    size: layout.size,
    origin: 'ai',
    zIndex: ++zIndexRef.current,
  };
}

export function renderContextHtml(title: string, body: string): string {
  const safeBody = escapeHtml(body).replace(/\n/g, '<br />');
  return `
    <div class="context-widget">
      <strong class="context-widget-title">${escapeHtml(title)}</strong>
      <p class="context-widget-body">${safeBody}</p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
