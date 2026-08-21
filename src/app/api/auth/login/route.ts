import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db';
import { setSession } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password) {
      return NextResponse.json({ error: '请输入用户名和密码' }, { status: 400 });
    }

    const db = getDb();
    const { data: users, error } = await db
      .from('users')
      .select('id, username, password_hash, display_name, role')
      .eq('username', username);

    if (error) throw new Error(`查询失败: ${error.message}`);
    if (!users || users.length === 0) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    const user = users[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return NextResponse.json({ error: '用户名或密码错误' }, { status: 401 });
    }

    const session = {
      id: user.id,
      username: user.username,
      display_name: user.display_name,
      role: user.role as 'admin' | 'staff',
    };

    const token = await setSession(session);
    return NextResponse.json({ success: true, user: session, token });
  } catch (e) {
    const message = e instanceof Error ? e.message : '登录失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
