import Cerebras from '@cerebras/cerebras_cloud_sdk';
import type {
  DesktopModelProvider,
  WidgetLLMResponse,
} from './shared';
import {
  desktopSystemPrompt,
  extractJsonPayload,
  formatContextSnapshot,
  widgetSchema,
} from './shared';

const DEFAULT_MODEL = process.env.CEREBRAS_MODEL ?? 'zai-glm-4.6';

export class CerebrasProvider implements DesktopModelProvider {
  readonly name = 'cerebras';
  private readonly client: Cerebras;

  constructor(
    apiKey?: string,
    private readonly model: string = DEFAULT_MODEL,
  ) {
    if (!apiKey) {
      throw new Error(
        'Missing CEREBRAS_API_KEY. Add it to .env or your shell environment.',
      );
    }
    this.client = new Cerebras({ apiKey });
  }

  async generateWidget(
    userPrompt: string,
    contextSnapshot?: Record<string, string>,
  ): Promise<WidgetLLMResponse> {
    const messages: Array<{ role: 'system' | 'user'; content: string }> = [
      { role: 'system', content: desktopSystemPrompt },
    ];

    const contextText = formatContextSnapshot(contextSnapshot);
    if (contextText) {
      messages.push({
        role: 'system',
        content: `Context snapshot:\n${contextText}`,
      });
    }

    messages.push({
      role: 'user',
      content: `${userPrompt}\n\nReturn valid JSON only.`,
    });

    const completion = (await this.client.chat.completions.create({
      model: this.model,
      temperature: 0.4,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'desktop_widget',
          strict: true,
          schema: widgetSchema,
        },
      },
      messages,
    })) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const assistantContent = completion.choices?.[0]?.message?.content;
    if (!assistantContent) {
      throw new Error('Cerebras chat API returned an empty response');
    }

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(assistantContent);
    } catch {
      parsed = extractJsonPayload(assistantContent);
    }

    return parsed as WidgetLLMResponse;
  }
}
