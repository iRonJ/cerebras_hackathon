import type { DesktopModelProvider } from './shared';
import { OpenRouterProvider } from './openRouterProvider';
import { CerebrasProvider } from './cerebrasProvider';

export function createModelProvider(): DesktopModelProvider {
  const providerName = (
    process.env.DESKTOP_AI_PROVIDER ?? 'openrouter'
  ).toLowerCase();

  switch (providerName) {
    case 'cerebras':
      return new CerebrasProvider(process.env.CEREBRAS_API_KEY);
    case 'openrouter':
    default:
      return new OpenRouterProvider(process.env.OPENROUTER_API_KEY);
  }
}
