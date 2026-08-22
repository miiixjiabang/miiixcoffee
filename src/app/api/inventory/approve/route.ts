import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// PUT /api/inventory/approve - approve a record
export async function PUT(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
    if (session.role !== 'admin') return NextResponse.json({ error: '仅店长可审核' }, { status: 403 });

    const { record_id } = await req.json();
    if (!record_id) return NextResponse.json({ error: '缺少记录ID' }, { status: 400 });

    const db = getDb();

    const { error } = await db
      .from('inventory_records')
      .update({
        status: 'approved',
        approved_by: session.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', record_id);

    if (error) throw new Error(`审核失败: ${error.message}`);

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : '审核失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// GET /api/inventory/approve?record_id=xxx - get record details for approval
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
    if (session.role !== 'admin') return NextResponse.json({ error: '仅店长可查看' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const recordId = searchParams.get('record_id');

    const db = getDb();

    if (recordId) {
      const { data: record } = await db
        .from('inventory_records')
        .select('*, users!inventory_records_created_by_fkey(display_name)')
        .eq('id', recordId)
        .single();

      if (!record) return NextResponse.json({ error: '记录不存在' }, { status: 404 });

      const { data: items } = await db
        .from('inventory_items')
        .select('*, materials(name, category, unit)')
        .eq('record_id', recordId)
        .order('id');

      return NextResponse.json({ record, items: items || [] });
    }

    // List all pending records
    const { data: records } = await db
      .from('inventory_records')
      .select('*, users!inventory_records_created_by_fkey(display_name)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(50);

    return NextResponse.json({ records: records || [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}