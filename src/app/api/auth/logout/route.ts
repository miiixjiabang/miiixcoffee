import { NextResponse } from 'next/server';
import { getSession, clearSession } from '@/lib/auth';

export async function GET() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: '未登录' }, { status: 401 });
  }
  return NextResponse.json({ user: session });
}

export async function POST() {
  await clearSession();
  return NextResponse.json({ success: true });
}
