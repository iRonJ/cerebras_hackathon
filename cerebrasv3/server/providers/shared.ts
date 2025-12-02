export interface WidgetLLMResponse {
  HTMLText?: string;
  prompt?: string;
  liveData?: boolean;
  LLMExplanation?: string;
  contextKey?: string;
  notice?: string;
}

export interface DesktopModelProvider {
  readonly name: string;
  generateWidget(
    userPrompt: string,
    contextSnapshot?: Record<string, string>,
  ): Promise<WidgetLLMResponse>;
}

export const widgetSchema = {
  type: 'object',
  properties: {
    HTMLText: {
      type: 'string',
      description:
        'Fully rendered HTML for the widget. You may use inline styles and lightweight scripts only if needed.',
    },
    prompt: {
      type: 'string',
      description:
        'A compact reminder prompt you can reuse to refresh this widget later.',
    },
    liveData: {
      type: 'boolean',
      description:
        'Set to true when this widget needs background refreshes (stocks, weather, news, timers, etc).',
    },
    LLMExplanation: {
      type: 'string',
      description: 'Short description of why this widget content was chosen.',
    },
    contextKey: {
      type: 'string',
      description:
        'Optional context identifier for storing shared data for this widget.',
    },
    notice: {
      type: 'string',
      description: 'Optional notification to display at the top of the desktop.',
    },
  },
  required: ['HTMLText', 'prompt', 'liveData'],
  additionalProperties: false,
};

export const desktopSystemPrompt = `You are an AI OS that produces responsive HTML widget applets.
1. Widgets MUST be fully responsive and adapt to container size. Use flexbox/grid.
2. If 'current_content' is provided in the context, you are REFINING an existing widget. You MUST update the code based on the user's request, preserving existing functionality unless asked to change it.
3. ALWAYS respond with JSON matching this schema: ${JSON.stringify(
  widgetSchema,
)}`;

export function formatContextSnapshot(
  snapshot?: Record<string, string>,
): string | undefined {
  if (!snapshot || Object.keys(snapshot).length === 0) return undefined;
  return Object.entries(snapshot)
    .map(([key, value]) => `${key}: ${value}`)
    .join('\n');
}

export function extractJsonPayload(content: string): Record<string, unknown> {
  const match = content.match(/([\[{].*[\]}])/s);
  if (!match) {
    throw new Error('Unable to locate JSON payload in LLM response');
  }
  return JSON.parse(match[1]);
}
