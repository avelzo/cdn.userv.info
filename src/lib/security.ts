import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { consumeRateLimit, type RateLimitResult } from '@/src/lib/rate-limit';

export { consumeRateLimit } from '@/src/lib/rate-limit';

export interface AuthenticatedUser {
  id: string;
  email?: string | null;
  name?: string | null;
}

export type AuthenticationResult =
  | { user: AuthenticatedUser; response?: never }
  | { user?: never; response: NextResponse };

export async function requireAuthenticatedUser(request: Request | NextRequest): Promise<AuthenticationResult> {
  const session = await auth.api.getSession({ headers: request.headers });
  const user = session?.user;
  if (!user?.id) {
    return {
      response: NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401, headers: { 'Cache-Control': 'private, no-store' } },
      ),
    };
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  };
}

export async function getOptionalAuthenticatedUserId(request: Request | NextRequest): Promise<string | undefined> {
  const session = await auth.api.getSession({ headers: request.headers });
  return session?.user.id;
}

export function isMongoObjectId(value: unknown): value is string {
  return typeof value === 'string' && /^[a-f\d]{24}$/i.test(value);
}

export function getClientIp(request: NextRequest | Request): string {
  const forwarded = request.headers.get('x-forwarded-for');
  return forwarded?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')?.trim()
    || 'unknown';
}

export function getRequestId(request: NextRequest | Request): string {
  return request.headers.get('x-request-id') || crypto.randomUUID();
}

export function securityLog(
  event: string,
  fields: Record<string, string | number | boolean | null | undefined> = {},
): void {
  console.info(JSON.stringify({
    timestamp: new Date().toISOString(),
    event,
    ...fields,
  }));
}

export function rateLimitResponse(result: RateLimitResult): NextResponse {
  return NextResponse.json(
    { success: false, error: 'Too many requests. Please retry later.' },
    {
      status: 429,
      headers: { 'Retry-After': String(result.retryAfter) },
    },
  );
}

export function envPositiveInt(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isSafeInteger(value) && value > 0 ? value : fallback;
}
