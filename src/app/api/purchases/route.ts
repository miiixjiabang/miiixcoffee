import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/purchases?date=2024-01-01
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const date = searchParams.get('date');
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const db = getDb();
    let query = db
      .from('purchase_records')
      .select('*, materials(name, category, unit)')
      .eq('store_id', 1)
      .order('purchase_date', { ascending: false });

    if (date) {
      query = query.eq('purchase_date', date);
    }
    if (startDate && endDate) {
      query = query.gte('purchase_date', startDate).lte('purchase_date', endDate);
    }

    const { data, error } = await query.limit(100);
    if (error) throw new Error(`查询失败: ${error.message}`);
    return NextResponse.json({ purchases: data || [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/purchases
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { material_id, purchase_date, quantity, unit_price } = await req.json();

    if (!material_id || !purchase_date || !quantity || !unit_price) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    const totalAmount = Math.round(quantity * unit_price * 100) / 100;
    const db = getDb();

    const { data, error } = await db
      .from('purchase_records')
      .insert({
        store_id: 1,
        material_id,
        purchase_date,
        quantity,
        unit_price,
        total_amount: totalAmount,
        created_by: session.id,
      })
      .select()
      .single();

    if (error) throw new Error(`保存失败: ${error.message}`);
    return NextResponse.json({ success: true, purchase: data });
  } catch (e) {
    const message = e instanceof Error ? e.message : '保存失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// DELETE /api/purchases?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: '缺少ID' }, { status: 400 });

    const db = getDb();
    const { error } = await db.from('purchase_records').delete().eq('id', parseInt(id));
    if (error) throw new Error(`删除失败: ${error.message}`);
    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : '删除失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
