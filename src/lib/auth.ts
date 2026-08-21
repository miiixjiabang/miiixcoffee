import { cookies, headers } from 'next/headers';
import { NextRequest } from 'next/server';

export interface SessionUser {
  id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'staff';
}

const COOKIE_NAME = 'miiix_session';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days

export async function setSession(user: SessionUser): Promise<string> {
  const cookieStore = await cookies();
  const encoded = Buffer.from(JSON.stringify(user)).toString('base64');
  cookieStore.set(COOKIE_NAME, encoded, {
    httpOnly: false,
    secure: false,
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return encoded;
}

export async function getSession(): Promise<SessionUser | null> {
  // Try cookie first
  const cookieStore = await cookies();
  const cookie = cookieStore.get(COOKIE_NAME);
  if (cookie) {
    try {
      return JSON.parse(Buffer.from(cookie.value, 'base64').toString()) as SessionUser;
    } catch {
      // fall through
    }
  }

  // Try Authorization header
  const headersList = await headers();
  const authHeader = headersList.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7);
    try {
      return JSON.parse(Buffer.from(token, 'base64').toString()) as SessionUser;
    } catch {
      return null;
    }
  }

  return null;
}

export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export function requireAuth(session: SessionUser | null): SessionUser {
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export function requireAdmin(session: SessionUser | null): SessionUser {
  const user = requireAuth(session);
  if (user.role !== 'admin') {
    throw new Error('Forbidden: admin only');
  }
  return user;
}

export function getBaseUrl(req: NextRequest): string {
  return req.nextUrl.origin;
}
