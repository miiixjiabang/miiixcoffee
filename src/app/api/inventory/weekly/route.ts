import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/inventory/weekly?week_start=2025-01-13
// Returns: auto-summary, manual count, waste comparison
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const weekStart = searchParams.get('week_start');
    if (!weekStart) return NextResponse.json({ error: '请指定周起始日期' }, { status: 400 });

    const db = getDb();

    // Calculate week end (Sunday = Monday + 6 days)
    const startDate = new Date(weekStart);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const weekEndStr = endDate.toISOString().split('T')[0];

    // Get previous day's closing stock (the day before week_start)
    const prevDate = new Date(startDate);
    prevDate.setDate(prevDate.getDate() - 1);
    const prevDateStr = prevDate.toISOString().split('T')[0];

    // 1. Get all daily records for this week
    const { data: dailyRecords } = await db
      .from('inventory_records')
      .select('id, record_date, total_amount')
      .eq('store_id', 1)
      .eq('record_type', 'daily')
      .gte('record_date', weekStart)
      .lte('record_date', weekEndStr)
      .order('record_date', { ascending: true });

    // 2. Get previous day's daily record (for opening stock)
    const { data: prevRecord } = await db
      .from('inventory_records')
      .select('id')
      .eq('store_id', 1)
      .eq('record_type', 'daily')
      .eq('record_date', prevDateStr)
      .limit(1);

    // 3. Get all purchases for this week
    const { data: weeklyPurchases } = await db
      .from('purchase_records')
      .select('material_id, quantity')
      .eq('store_id', 1)
      .gte('purchase_date', weekStart)
      .lte('purchase_date', weekEndStr);

    // 4. Get weekly manual count record if exists
    const { data: weeklyRecords } = await db
      .from('inventory_records')
      .select('*')
      .eq('store_id', 1)
      .eq('record_type', 'weekly')
      .eq('record_date', weekEndStr)
      .limit(1);

    const weeklyRecord = weeklyRecords && weeklyRecords.length > 0 ? weeklyRecords[0] : null;

    // 5. Get daily materials (35 items)
    const { data: materials } = await db
      .from('materials')
      .select('*')
      .eq('store_id', 1)
      .eq('is_daily', true)
      .order('sort_order', { ascending: true });

    const dailyMaterials = materials || [];

    // Build opening stock map from previous day's record
    const openingStockMap = new Map<number, number>();
    if (prevRecord && prevRecord.length > 0) {
      const { data: prevItems } = await db
        .from('inventory_items')
        .select('material_id, quantity')
        .eq('record_id', prevRecord[0].id);
      (prevItems || []).forEach((pi: { material_id: number; quantity: string }) => {
        openingStockMap.set(pi.material_id, parseFloat(pi.quantity));
      });
    }

    // Build daily consumption data
    const dailyConsumptionMap = new Map<number, number>(); // material_id -> total consumption
    const dailyClosingStock = new Map<number, number>(); // material_id -> Sunday closing stock

    // Get all daily items for this week
    if (dailyRecords && dailyRecords.length > 0) {
      const dailyRecordIds = dailyRecords.map((r: { id: number }) => r.id);
      const { data: dailyItems } = await db
        .from('inventory_items')
        .select('record_id, material_id, quantity, consumption, prev_quantity')
        .in('record_id', dailyRecordIds);

      // Organize by record date
      const recordDateMap = new Map<number, string>();
      dailyRecords.forEach((r: { id: number; record_date: string }) => {
        recordDateMap.set(r.id, r.record_date);
      });

      // Per material, accumulate consumption and get latest closing stock
      const materialDayData = new Map<number, { consumption: number; latestQty: number; latestDate: string }>();

      (dailyItems || []).forEach((item: { record_id: number; material_id: number; quantity: string; consumption: string; prev_quantity: string }) => {
        const mid = item.material_id;
        const cons = parseFloat(item.consumption || '0');
        const qty = parseFloat(item.quantity || '0');
        const date = recordDateMap.get(item.record_id) || '';

        const existing = materialDayData.get(mid) || { consumption: 0, latestQty: 0, latestDate: '' };
        existing.consumption += cons;

        // Track the latest (Sunday) closing stock
        if (date > existing.latestDate) {
          existing.latestQty = qty;
          existing.latestDate = date;
        }
        materialDayData.set(mid, existing);
      });

      materialDayData.forEach((data, mid) => {
        dailyConsumptionMap.set(mid, data.consumption);
        dailyClosingStock.set(mid, data.latestQty);
      });
    }

    // Build weekly purchases map
    const purchaseMap = new Map<number, number>();
    (weeklyPurchases || []).forEach((p: { material_id: number; quantity: string }) => {
      purchaseMap.set(p.material_id, (purchaseMap.get(p.material_id) || 0) + parseFloat(p.quantity));
    });

    // Get weekly manual count items if exists
    let weeklyItems: Record<string, unknown>[] = [];
    if (weeklyRecord) {
      const { data: items } = await db
        .from('inventory_items')
        .select('*, materials(name, category, unit)')
        .eq('record_id', weeklyRecord.id)
        .order('id', { ascending: true });
      weeklyItems = items || [];
    }

    // Build waste comparison data for each material
    const wasteData = dailyMaterials.map((mat: { id: number; name: string; category: string; unit: string; price: string | null }) => {
      const openingStock = openingStockMap.get(mat.id) || 0;
      const weeklyPurchases = purchaseMap.get(mat.id) || 0;
      const theoreticalConsumption = dailyConsumptionMap.get(mat.id) || 0;
      const dailyClosing = dailyClosingStock.get(mat.id) || 0;

      // Find actual weekly count quantity
      const weeklyItem = weeklyItems.find((wi: Record<string, unknown>) => wi.material_id === mat.id);
      const actualQty = weeklyItem ? parseFloat((weeklyItem.quantity as string) || '0') : null;
      const actualConsumption = actualQty !== null ? openingStock + weeklyPurchases - actualQty : null;
      const waste = actualConsumption !== null ? actualConsumption - theoreticalConsumption : null;

      const price = mat.price ? parseFloat(mat.price) : null;
      const wasteAmount = waste !== null && price ? waste * price : null;

      return {
        material_id: mat.id,
        material_name: mat.name,
        category: mat.category,
        unit: mat.unit,
        price,
        opening_stock: openingStock,
        weekly_purchases: weeklyPurchases,
        daily_closing_stock: dailyClosing,
        theoretical_consumption: Math.round(theoreticalConsumption * 100) / 100,
        actual_weekly_qty: actualQty !== null ? Math.round(actualQty * 100) / 100 : null,
        actual_consumption: actualConsumption !== null ? Math.round(actualConsumption * 100) / 100 : null,
        waste: waste !== null ? Math.round(waste * 100) / 100 : null,
        waste_amount: wasteAmount !== null ? Math.round(wasteAmount * 100) / 100 : null,
      };
    });

    return NextResponse.json({
      week_start: weekStart,
      week_end: weekEndStr,
      daily_records_count: dailyRecords?.length || 0,
      has_weekly_count: !!weeklyRecord,
      weekly_record: weeklyRecord || null,
      weekly_items: weeklyItems,
      materials: dailyMaterials,
      waste_comparison: wasteData,
      summary: {
        total_theoretical_consumption: wasteData.reduce((s: number, w: { theoretical_consumption: number }) => s + w.theoretical_consumption, 0),
        total_actual_consumption: wasteData.reduce((s: number, w: { actual_consumption: number | null }) => s + (w.actual_consumption || 0), 0),
        total_waste: wasteData.reduce((s: number, w: { waste: number | null }) => s + (w.waste || 0), 0),
        total_waste_amount: wasteData.reduce((s: number, w: { waste_amount: number | null }) => s + (w.waste_amount || 0), 0),
      },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/inventory/weekly - save weekly manual count
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { week_start, items } = await req.json();
    // items: { material_id, quantity }[]

    if (!week_start || !items || items.length === 0) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    const db = getDb();

    // Calculate week end (Sunday)
    const startDate = new Date(week_start);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 6);
    const weekEndStr = endDate.toISOString().split('T')[0];

    // Get materials for price lookup
    const materialIds = items.map((i: { material_id: number }) => i.material_id);
    const { data: materials, error: mErr } = await db
      .from('materials')
      .select('id, price')
      .in('id', materialIds);

    if (mErr) throw new Error(`查询物料失败: ${mErr.message}`);
    const priceMap = new Map<number, number | null>();
    (materials || []).forEach((m: { id: number; price: string | null }) => {
      priceMap.set(m.id, m.price ? parseFloat(m.price) : null);
    });

    // Calculate total
    let totalAmount = 0;
    const enrichedItems = items.map((item: { material_id: number; quantity: number }) => {
      const price = priceMap.get(item.material_id);
      const amount = price ? item.quantity * price : 0;
      totalAmount += amount;
      return {
        material_id: item.material_id,
        quantity: item.quantity,
        unit_price: price,
        amount: Math.round(amount * 100) / 100,
      };
    });

    // Check if weekly record exists for this week
    const { data: existing } = await db
      .from('inventory_records')
      .select('id')
      .eq('store_id', 1)
      .eq('record_type', 'weekly')
      .eq('record_date', weekEndStr)
      .limit(1);

    let recordId: number;

    if (existing && existing.length > 0) {
      recordId = existing[0].id;
      await db.from('inventory_records')
        .update({ total_amount: Math.round(totalAmount * 100) / 100 })
        .eq('id', recordId);
      await db.from('inventory_items').delete().eq('record_id', recordId);
    } else {
      const { data: newRecord, error: rErr } = await db
        .from('inventory_records')
        .insert({
          store_id: 1,
          record_type: 'weekly',
          record_date: weekEndStr,
          total_amount: Math.round(totalAmount * 100) / 100,
          created_by: session.id,
        })
        .select('id')
        .single();

      if (rErr) throw new Error(`创建记录失败: ${rErr.message}`);
      recordId = newRecord.id;
    }

    // Insert items
    if (enrichedItems.length > 0) {
      const { error: iErr } = await db
        .from('inventory_items')
        .insert(enrichedItems.map((item: Record<string, unknown>) => ({
          record_id: recordId,
          material_id: item.material_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          amount: item.amount,
        })));
      if (iErr) throw new Error(`保存明细失败: ${iErr.message}`);
    }

    return NextResponse.json({ success: true, record_id: recordId, total_amount: Math.round(totalAmount * 100) / 100 });
  } catch (e) {
    const message = e instanceof Error ? e.message : '保存失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}