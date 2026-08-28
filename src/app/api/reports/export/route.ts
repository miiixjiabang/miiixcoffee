import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/reports/export?type=summary&start_date=2026-01-01&end_date=2026-01-31
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });
    if (session.role !== 'admin') return NextResponse.json({ error: '仅店长可导出报表' }, { status: 403 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'summary';
    const startDate = searchParams.get('start_date');
    const endDate = searchParams.get('end_date');

    if (!startDate || !endDate) {
      return NextResponse.json({ error: '请指定日期范围' }, { status: 400 });
    }

    const db = getDb();

    let csv = '';

    if (type === 'summary') {
      csv = await exportSummary(db, startDate, endDate);
    } else if (type === 'daily') {
      csv = await exportDaily(db, startDate, endDate);
    } else if (type === 'weekly') {
      csv = await exportWeekly(db, startDate, endDate);
    } else if (type === 'monthly') {
      csv = await exportMonthly(db, startDate, endDate);
    } else {
      return NextResponse.json({ error: '不支持的导出类型' }, { status: 400 });
    }

    const filename = `miiix_${type}_${startDate}_${endDate}.csv`;
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '导出失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// 消耗汇总报表
async function exportSummary(db: any, startDate: string, endDate: string) {
  // Get all daily records in date range
  const { data: records } = await db
    .from('inventory_records')
    .select('id, record_date')
    .eq('store_id', 1)
    .eq('record_type', 'daily')
    .gte('record_date', startDate)
    .lte('record_date', endDate)
    .order('record_date', { ascending: true });

  if (!records || records.length === 0) return '暂无数据\n';

  const recordIds = records.map((r: { id: number }) => r.id);

  // Get all items with consumption data
  const { data: items } = await db
    .from('inventory_items')
    .select('material_id, consumption, consumption_amount, materials(name, category, unit, price)')
    .in('record_id', recordIds);

  // Aggregate by material
  const materialMap = new Map<number, { name: string; category: string; unit: string; price: number; total_consumption: number; total_amount: number }>();
  (items || []).forEach((item: Record<string, unknown>) => {
    const mid = item.material_id as number;
    const mat = item.materials as Record<string, unknown> || {};
    const cons = parseFloat((item.consumption as string) || '0');
    const amount = parseFloat((item.consumption_amount as string) || '0');
    const price = parseFloat(String(mat.price || '0'));

    if (!materialMap.has(mid)) {
      materialMap.set(mid, {
        name: String(mat.name || ''),
        category: String(mat.category || ''),
        unit: String(mat.unit || ''),
        price,
        total_consumption: 0,
        total_amount: 0,
      });
    }
    const d = materialMap.get(mid)!;
    d.total_consumption += cons;
    d.total_amount += amount;
  });

  // Generate CSV
  const rows = [['开始日期', '结束日期', '物料名称', '分类', '单位', '总消耗量', '单价(元)', '总消耗金额(元)']];
  materialMap.forEach((d) => {
    rows.push([
      startDate, endDate, d.name, d.category, d.unit,
      d.total_consumption.toFixed(2), d.price.toFixed(2), d.total_amount.toFixed(2),
    ]);
  });

  return rows.map(r => r.join(',')).join('\n') + '\n';
}

// 日盘底表
async function exportDaily(db: any, startDate: string, endDate: string) {
  const { data: records } = await db
    .from('inventory_records')
    .select('id, record_date, total_amount, status')
    .eq('store_id', 1)
    .eq('record_type', 'daily')
    .gte('record_date', startDate)
    .lte('record_date', endDate)
    .order('record_date', { ascending: true });

  if (!records || records.length === 0) return '暂无数据\n';

  const recordIds = records.map((r: { id: number }) => r.id);
  const recordDateMap = new Map(records.map((r: { id: number; record_date: string }) => [r.id, r.record_date]));

  const { data: items } = await db
    .from('inventory_items')
    .select('record_id, material_id, quantity, prev_quantity, consumption, consumption_amount, unit_price, amount, materials(name, category, unit, price)')
    .in('record_id', recordIds)
    .order('id', { ascending: true });

  const rows = [['日期', '物料名称', '分类', '单位', '期初库存', '进货量', '期末库存', '消耗量', '单价(元)', '消耗金额(元)']];
  (items || []).forEach((item: Record<string, unknown>) => {
    const date = recordDateMap.get(item.record_id as number) || '';
    const mat = item.materials as Record<string, unknown> || {};
    const prevQty = parseFloat((item.prev_quantity as string) || '0');
    const qty = parseFloat((item.quantity as string) || '0');
    const cons = parseFloat((item.consumption as string) || '0');
    const amount = parseFloat((item.consumption_amount as string) || '0');
    const price = parseFloat((item.unit_price as string) || '0');

    // 进货量 = 消耗量 + 期末库存 - 期初库存 (if consumption is calculated)
    const purchaseQty = Math.max(0, parseFloat((cons + qty - prevQty).toFixed(2)));

    rows.push([
      String(date), String(mat.name || ''), String(mat.category || ''), String(mat.unit || ''),
      prevQty.toFixed(2), purchaseQty.toFixed(2), qty.toFixed(2), cons.toFixed(2),
      price.toFixed(2), amount.toFixed(2),
    ]);
  });

  return rows.map(r => r.join(',')).join('\n') + '\n';
}

// 周盘底表（含损耗对比）
async function exportWeekly(db: any, startDate: string, endDate: string) {
  // Get weekly records in date range
  const { data: records } = await db
    .from('inventory_records')
    .select('id, record_date, total_amount, status')
    .eq('store_id', 1)
    .eq('record_type', 'weekly')
    .gte('record_date', startDate)
    .lte('record_date', endDate)
    .order('record_date', { ascending: true });

  if (!records || records.length === 0) return '暂无数据\n';

  const rows = [['周次', '物料名称', '分类', '单位', '理论消耗', '实际消耗', '损耗量', '损耗金额(元)']];

  for (const record of records) {
    const weekEndStr = record.record_date;
    const startOfWeek = new Date(weekEndStr);
    startOfWeek.setDate(startOfWeek.getDate() - 6);
    const weekStartStr = startOfWeek.toISOString().split('T')[0];
    const weekLabel = `${weekStartStr}~${weekEndStr}`;

    // Get daily records for this week
    const { data: dailyRecords } = await db
      .from('inventory_records')
      .select('id')
      .eq('store_id', 1)
      .eq('record_type', 'daily')
      .gte('record_date', weekStartStr)
      .lte('record_date', weekEndStr);

    // Get weekly items
    const { data: weeklyItems } = await db
      .from('inventory_items')
      .select('material_id, quantity, materials(name, category, unit, price)')
      .eq('record_id', record.id);

    // Get daily items for consumption calculation
    let dailyConsumptionMap = new Map<number, number>();
    if (dailyRecords && dailyRecords.length > 0) {
      const dailyIds = dailyRecords.map((r: { id: number }) => r.id);
      const { data: dailyItems } = await db
        .from('inventory_items')
        .select('material_id, consumption')
        .in('record_id', dailyIds);

      (dailyItems || []).forEach((item: { material_id: number; consumption: string }) => {
        const mid = item.material_id;
        dailyConsumptionMap.set(mid, (dailyConsumptionMap.get(mid) || 0) + parseFloat(item.consumption || '0'));
      });
    }

    (weeklyItems || []).forEach((item: Record<string, unknown>) => {
      const mid = item.material_id as number;
      const mat = item.materials as Record<string, unknown> || {};
      const actualQty = parseFloat((item.quantity as string) || '0');
      const theoreticalCons = dailyConsumptionMap.get(mid) || 0;
      const price = parseFloat((mat.price as string) || '0');
      const waste = theoreticalCons - actualQty;
      const wasteAmount = waste * price;

      rows.push([
        weekLabel, String(mat.name || ''), String(mat.category || ''), String(mat.unit || ''),
        theoreticalCons.toFixed(2), actualQty.toFixed(2), waste.toFixed(2), wasteAmount.toFixed(2),
      ]);
    });
  }

  return rows.map(r => r.join(',')).join('\n') + '\n';
}

// 月盘底表
async function exportMonthly(db: any, startDate: string, endDate: string) {
  const { data: records } = await db
    .from('inventory_records')
    .select('id, record_date, total_amount, status')
    .eq('store_id', 1)
    .eq('record_type', 'monthly')
    .gte('record_date', startDate)
    .lte('record_date', endDate)
    .order('record_date', { ascending: true });

  if (!records || records.length === 0) return '暂无数据\n';

  const recordIds = records.map((r: { id: number }) => r.id);
  const recordDateMap = new Map(records.map((r: { id: number; record_date: string }) => [r.id, r.record_date]));

  const { data: items } = await db
    .from('inventory_items')
    .select('record_id, material_id, quantity, prev_quantity, consumption, amount, unit_price, materials(name, category, unit, price)')
    .in('record_id', recordIds)
    .order('id', { ascending: true });

  const rows = [['月份', '物料名称', '分类', '单位', '期初库存', '进货量', '期末库存', '消耗量', '单价(元)', '消耗金额(元)']];
  (items || []).forEach((item: Record<string, unknown>) => {
    const date = recordDateMap.get(item.record_id as number) || '';
    const mat = item.materials as Record<string, unknown> || {};
    const prevQty = parseFloat((item.prev_quantity as string) || '0');
    const qty = parseFloat((item.quantity as string) || '0');
    const cons = parseFloat((item.consumption as string) || '0');
    const amount = parseFloat((item.amount as string) || '0');
    const price = parseFloat((item.unit_price as string) || '0');
    const purchaseQty = Math.max(0, parseFloat((cons + qty - prevQty).toFixed(2)));

    rows.push([
      String(date), String(mat.name || ''), String(mat.category || ''), String(mat.unit || ''),
      prevQty.toFixed(2), purchaseQty.toFixed(2), qty.toFixed(2), cons.toFixed(2),
      price.toFixed(2), amount.toFixed(2),
    ]);
  });

  return rows.map(r => r.join(',')).join('\n') + '\n';
}