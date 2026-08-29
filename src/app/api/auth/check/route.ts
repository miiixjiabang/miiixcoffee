import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ valid: false, error: '未登录' }, { status: 401 });
    }

    // Verify user still exists in database
    const db = getDb();
    const { data: userData, error } = await db
      .from('users')
      .select('id, username, display_name, role')
      .eq('id', session.id)
      .limit(1)
      .single();

    if (error || !userData) {
      return NextResponse.json({ valid: false, error: '用户不存在' }, { status: 401 });
    }

    return NextResponse.json({
      valid: true,
      user: {
        id: userData.id,
        username: userData.username,
        display_name: userData.display_name,
        role: userData.role,
      },
    });
  } catch (error) {
    console.error('Auth check error:', error);
    return NextResponse.json({ valid: false, error: '验证失败' }, { status: 500 });
  }
}