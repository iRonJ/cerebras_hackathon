import type {
  DesktopModelProvider,
  WidgetLLMResponse,
} from './shared';
import {
  desktopSystemPrompt,
  extractJsonPayload,
  formatContextSnapshot,
} from './shared';

type Message = {
  role: 'system' | 'user';
  content: string;
};

type OpenRouterChoice = {
  message?: { content?: string };
};

type OpenRouterResponse = {
  choices?: OpenRouterChoice[];
};

export class OpenRouterProvider implements DesktopModelProvider {
  readonly name = 'openrouter';
  private readonly endpoint = 'https://openrouter.ai/api/v1/chat/completions';

  constructor(private readonly apiKey?: string) { }

  private ensureKey(): void {
    if (!this.apiKey) {
      throw new Error(
        'Missing OPENROUTER_API_KEY. Add it to .env or your shell environment.',
      );
    }
  }

  async generateWidget(
    userPrompt: string,
    contextSnapshot?: Record<string, string>,
  ): Promise<WidgetLLMResponse> {
    this.ensureKey();
    const messages: Message[] = [
      { role: 'system', content: desktopSystemPrompt },
    ];

    const contextText = formatContextSnapshot(contextSnapshot);
    if (contextText) {
      messages.push({
        role: 'system',
        content: `Context snapshot:\n${contextText}`,
      });
    }

    messages.push({ role: 'user', content: userPrompt });

    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        stream: false,
        provider: { only: ['Cerebras'] },
        messages,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenRouter request failed (${response.status}): ${errorBody}`,
      );
    }

    const data = (await response.json()) as OpenRouterResponse;
    const content: string | undefined =
      data.choices?.[0]?.message?.content ?? undefined;
    if (!content) {
      throw new Error('OpenRouter returned an empty response');
    }

    const parsed = extractJsonPayload(content);
    return parsed as WidgetLLMResponse;
  }

  async chat(systemPrompt: string, userPrompt: string): Promise<string> {
    this.ensureKey();
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'qwen/qwen3-32b',
        stream: false,
        provider: { only: ['Cerebras'] },
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(
        `OpenRouter request failed (${response.status}): ${errorBody}`,
      );
    }

    const data = (await response.json()) as OpenRouterResponse;
    return data.choices?.[0]?.message?.content ?? '';
  }
}
