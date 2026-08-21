import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { getSession } from '@/lib/auth';

// GET /api/inventory?type=daily&date=2024-01-01
export async function GET(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'daily';
    const date = searchParams.get('date');

    const db = getDb();

    if (date) {
      // Get specific record
      const { data: records, error: rErr } = await db
        .from('inventory_records')
        .select('*')
        .eq('store_id', 1)
        .eq('record_type', type)
        .eq('record_date', date)
        .order('created_at', { ascending: false })
        .limit(1);

      if (rErr) throw new Error(`查询失败: ${rErr.message}`);
      if (!records || records.length === 0) {
        return NextResponse.json({ record: null, items: [] });
      }

      const record = records[0];
      const { data: items, error: iErr } = await db
        .from('inventory_items')
        .select('*, materials(name, category, unit)')
        .eq('record_id', record.id)
        .order('id', { ascending: true });

      if (iErr) throw new Error(`查询失败: ${iErr.message}`);
      return NextResponse.json({ record, items: items || [] });
    }

    // List records
    const { data: records, error } = await db
      .from('inventory_records')
      .select('*')
      .eq('store_id', 1)
      .eq('record_type', type)
      .order('record_date', { ascending: false })
      .limit(50);

    if (error) throw new Error(`查询失败: ${error.message}`);
    return NextResponse.json({ records: records || [] });
  } catch (e) {
    const message = e instanceof Error ? e.message : '查询失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

// POST /api/inventory - save inventory record
export async function POST(req: NextRequest) {
  try {
    const session = await getSession();
    if (!session) return NextResponse.json({ error: '未登录' }, { status: 401 });

    const { record_type, record_date, items } = await req.json();
    // items: { material_id, quantity }[]

    if (!record_type || !record_date || !items || items.length === 0) {
      return NextResponse.json({ error: '参数不完整' }, { status: 400 });
    }

    const db = getDb();

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

    // Get previous record for consumption calculation
    const { data: prevRecords } = await db
      .from('inventory_records')
      .select('id')
      .eq('store_id', 1)
      .eq('record_type', record_type)
      .lt('record_date', record_date)
      .order('record_date', { ascending: false })
      .limit(1);

    let prevItemsMap = new Map<number, number>();
    if (prevRecords && prevRecords.length > 0) {
      const { data: prevItems } = await db
        .from('inventory_items')
        .select('material_id, quantity')
        .eq('record_id', prevRecords[0].id);

      (prevItems || []).forEach((pi: { material_id: number; quantity: string }) => {
        prevItemsMap.set(pi.material_id, parseFloat(pi.quantity));
      });
    }

    // Get purchases for this date
    const { data: purchases } = await db
      .from('purchase_records')
      .select('material_id, quantity')
      .eq('store_id', 1)
      .eq('purchase_date', record_date);

    const purchaseMap = new Map<number, number>();
    (purchases || []).forEach((p: { material_id: number; quantity: string }) => {
      purchaseMap.set(p.material_id, parseFloat(p.quantity));
    });

    // Calculate totals
    let totalAmount = 0;
    const enrichedItems = items.map((item: { material_id: number; quantity: number }) => {
      const price = priceMap.get(item.material_id);
      const amount = price ? item.quantity * price : 0;
      totalAmount += amount;

      const prevQty = prevItemsMap.get(item.material_id) || 0;
      const purchaseQty = purchaseMap.get(item.material_id) || 0;
      const consumption = Math.max(0, prevQty + purchaseQty - item.quantity);
      const consumptionAmount = price ? consumption * price : 0;

      return {
        material_id: item.material_id,
        quantity: item.quantity,
        unit_price: price,
        amount: Math.round(amount * 100) / 100,
        prev_quantity: prevQty,
        consumption: Math.round(consumption * 100) / 100,
        consumption_amount: Math.round(consumptionAmount * 100) / 100,
      };
    });

    // Check if record exists for this date, update or insert
    const { data: existing } = await db
      .from('inventory_records')
      .select('id')
      .eq('store_id', 1)
      .eq('record_type', record_type)
      .eq('record_date', record_date)
      .limit(1);

    let recordId: number;

    if (existing && existing.length > 0) {
      recordId = existing[0].id;
      // Update record
      const { error: uErr } = await db
        .from('inventory_records')
        .update({ total_amount: Math.round(totalAmount * 100) / 100 })
        .eq('id', recordId);
      if (uErr) throw new Error(`更新记录失败: ${uErr.message}`);

      // Delete old items
      const { error: dErr } = await db
        .from('inventory_items')
        .delete()
        .eq('record_id', recordId);
      if (dErr) throw new Error(`删除旧数据失败: ${dErr.message}`);
    } else {
      // Insert new record
      const { data: newRecord, error: rErr } = await db
        .from('inventory_records')
        .insert({
          store_id: 1,
          record_type,
          record_date,
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
          prev_quantity: item.prev_quantity,
          consumption: item.consumption,
          consumption_amount: item.consumption_amount,
        })));
      if (iErr) throw new Error(`保存明细失败: ${iErr.message}`);
    }

    return NextResponse.json({ success: true, record_id: recordId, total_amount: Math.round(totalAmount * 100) / 100 });
  } catch (e) {
    const message = e instanceof Error ? e.message : '保存失败';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
