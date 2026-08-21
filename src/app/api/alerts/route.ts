import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/alerts - get all thresholds and current stock status
export async function GET() {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const db = getDb();

    // Get all thresholds
    const { data: thresholds, error: tErr } = await db
      .from('alert_thresholds')
      .select('*, materials(name, category, unit)')
      .eq('store_id', 1);

    if (tErr) throw new Error(`查询失败: ${tErr.message}`);

    // Get latest inventory for each material
    const { data: latestRecords } = await db
      .from('inventory_records')
      .select('id, record_type, record_date')
      .eq('store_id', 1)
      .order('record_date', { ascending: false })
      .limit(100);

    // Group by type and get latest
    const latestByType: Record<string, number> = {};
    (latestRecords || []).forEach((r: { id: number; record_type: string; record_date: string }) => {
      if (!latestByType[r.record_type]) {
        latestByType[r.record_type] = r.id;
      }
    });

    // Get latest daily items
    let latestStock = new Map<number, number>();
    if (latestByType['daily']) {
      const { data: dailyItems } = await db
        .from('inventory_items')
        .select('material_id, quantity')
        .eq('record_id', latestByType['daily']);
      (dailyItems || []).forEach((item: { material_id: number; quantity: string }) => {
        latestStock.set(item.material_id, parseFloat(item.quantity));
      });
    }

    // Build alert list
    const alerts = (thresholds || []).map((t: Record<string, unknown>) => {
      const material = t.materials as { name: string; category: string; unit: string } | null;
      const currentStock = latestStock.get(t.material_id as number) ?? 0;
      const threshold = parseFloat(t.threshold as string);
      return {
        id: t.id,
        material_id: t.material_id,
        threshold,
        current_stock: currentStock,
        is_alert: currentStock < threshold,
        material_name: material?.name || '',
        category: material?.category || '',
        unit: material?.unit || '',
      };
    });

    const alertItems = alerts.filter((a: { is_alert: boolean }) => a.is_alert);

    return NextResponse.json({
      thresholds: alerts,
      alert_count: alertItems.length,
      alerts: alertItems,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/alerts - update threshold
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
    if (session.role !== 'admin') return NextResponse.json({ error: '仅店长可设置' }, { status: 403 });

    const { material_id, threshold } = await req.json();
    if (!material_id || threshold === undefined) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    const db = getDb();

    // Upsert
    const { data: existing } = await db
      .from('alert_thresholds')
      .select('id')
      .eq('store_id', 1)
      .eq('material_id', material_id)
      .limit(1);

    if (existing && existing.length > 0) {
      const { error } = await db
        .from('alert_thresholds')
        .update({ threshold, updated_at: new Date().toISOString() })
        .eq('id', existing[0].id);
      if (error) throw new Error(`更新失败: ${error.message}`);
    } else {
      const { error } = await db
        .from('alert_thresholds')
        .insert({ store_id: 1, material_id, threshold });
      if (error) throw new Error(`创建失败: ${error.message}`);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : '保存失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
