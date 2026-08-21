import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: '未登录' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type'); // 'daily' or null (all)

    const db = getDb();
    let query = db
      .from('materials')
      .select('id, name, category, unit, price, is_daily, sort_order')
      .eq('store_id', 1)
      .order('sort_order', { ascending: true });

    if (type === 'daily') {
      query = query.eq('is_daily', true);
    }

    const { data, error } = await query;
    if (error) throw new Error(`查询失败: ${error.message}`);

    return NextResponse.json({ materials: data || [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
