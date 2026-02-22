import Anthropic from '@anthropic-ai/sdk';

export function getAnthropicClient() {
  const apiKey = process.env.TARUSHIRU_ANTHROPIC_KEY || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('TARUSHIRU_ANTHROPIC_KEY is not set');
  }
  return new Anthropic({ apiKey });
}

export const MODEL = 'claude-haiku-4-5-20251001';
