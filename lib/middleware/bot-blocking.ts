import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

const BLOCKED_BOTS = [
  'GPTBot', 'ChatGPT-User', 'CCBot', 'ClaudeBot', 'anthropic-ai',
  'PerplexityBot', 'Bytespider', 'meta-externalagent', 'FacebookBot',
  'facebookexternalhit', 'AhrefsBot', 'SemrushBot', 'MJ12bot', 'DotBot',
  'PetalBot', 'Amazonbot', 'YouBot', 'Applebot-Extended', 'cohere-ai',
  'Google-Extended',
];

export function isBlockedBot(ua: string): boolean {
  const lower = ua.toLowerCase();
  return BLOCKED_BOTS.some((bot) => lower.includes(bot.toLowerCase()));
}

/**
 * Returns a 403 response if the request comes from a blocked bot, otherwise null.
 */
export function checkBotBlocking(req: NextRequest): NextResponse | null {
  const userAgent = req.headers.get('user-agent') ?? '';
  if (userAgent && isBlockedBot(userAgent)) {
    return new NextResponse('Forbidden', { status: 403 });
  }
  return null;
}
