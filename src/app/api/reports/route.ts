import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/reports?type=daily&start_date=2024-01-01&end_date=2024-01-31
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
    if (session.role !== 'admin') return NextResponse.json({ error: '仅店长可查看报表' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'daily';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    const db = getDb();

    // Get records in date range
    let query = db
      .from('inventory_records')
      .select('id, record_date, total_amount')
      .eq('store_id', 1)
      .eq('record_type', type);

    if (startDate) query = query.gte('record_date', startDate);
    if (endDate) query = query.lte('record_date', endDate);

    query = query.order('record_date', { ascending: true });

    const { data: records, error: rErr } = await query;
    if (rErr) throw new Error(`查询失败: ${rErr.message}`);

    if (!records || records.length === 0) {
      return NextResponse.json({ summary: [], trend: [] });
    }

    const recordIds = records.map((r: { id: number }) => r.id);

    // Get all items for these records
    const { data: allItems, error: iErr } = await db
      .from('inventory_items')
      .select('record_id, material_id, quantity, amount, consumption, consumption_amount, materials(name, category)')
      .in('record_id', recordIds);

    if (iErr) throw new Error(`查询失败: ${iErr.message}`);

    // Build summary by date
    const summaryByDate: Record<string, { date: string; total_amount: number; total_consumption: number; items: number }> = {};
    records.forEach((r: { id: number; record_date: string; total_amount: string }) => {
      summaryByDate[r.record_date] = {
        date: r.record_date,
        total_amount: parseFloat(r.total_amount || '0'),
        total_consumption: 0,
        items: 0,
      };
    });

    (allItems || []).forEach((item: Record<string, unknown>) => {
      const date = records.find((r: { id: number }) => r.id === item.record_id)?.record_date;
      if (date && summaryByDate[date]) {
        summaryByDate[date].total_consumption += parseFloat((item.consumption_amount as string) || '0');
        summaryByDate[date].items += 1;
      }
    });

    // Build trend data (by material)
    const materialTrend: Record<number, { name: string; category: string; data: Record<string, number> }> = {};
    (allItems || []).forEach((item: Record<string, unknown>) => {
      const mid = item.material_id as number;
      const material = item.materials as { name: string; category: string } | null;
      const date = records.find((r: { id: number }) => r.id === item.record_id)?.record_date;

      if (!materialTrend[mid]) {
        materialTrend[mid] = {
          name: material?.name || '',
          category: material?.category || '',
          data: {},
        };
      }
      if (date) {
        materialTrend[mid].data[date] = parseFloat((item.consumption as string) || '0');
      }
    });

    const summary = Object.values(summaryByDate).sort((a, b) => a.date.localeCompare(b.date));
    const trend = Object.entries(materialTrend).map(([id, v]) => ({
      material_id: parseInt(id),
      name: v.name,
      category: v.category,
      data: v.data,
    }));

    return NextResponse.json({ summary, trend, records_count: records.length });
  } catch (e) {
    const message = e instanceof Error ? e.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
