'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getToken } from '@/lib/api';

interface Material {
  id: number;
  name: string;
  category: string;
  unit: string;
  price: string | null;
  is_daily: boolean;
  sort_order: number;
}

interface InventoryItem {
  material_id: number;
  quantity: number;
  unit_price?: number;
  amount?: number;
  prev_quantity?: number;
  consumption?: number;
  consumption_amount?: number;
  material_name?: string;
  category?: string;
  unit?: string;
}

interface InventoryFormProps {
  type: 'daily' | 'weekly' | 'monthly';
  title: string;
  dateLabel: string;
  datePlaceholder: string;
}

export default function InventoryForm({ type, title, dateLabel, datePlaceholder }: InventoryFormProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [date, setDate] = useState('');
  const [items, setItems] = useState<Map<number, number>>(new Map());
  const [savedItems, setSavedItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [totalAmount, setTotalAmount] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const tabRef = useRef<HTMLDivElement>(null);

  const loadMaterials = useCallback(async () => {
    const isDaily = type === 'daily' || type === 'weekly';
    const url = `/api/materials?type=${isDaily ? 'daily' : ''}`;
    const res = await fetch(url, {
      headers: getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {}
    });
    const data = await res.json();
    setMaterials(data.materials || []);
    setLoading(false);
  }, [type]);

  const loadRecord = useCallback(async (recordDate: string) => {
    const headers: Record<string, string> = {};
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const res = await fetch(`/api/inventory?type=${type}&date=${recordDate}`, { headers });
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const itemMap = new Map<number, number>();
      const saved: InventoryItem[] = [];
      data.items.forEach((item: Record<string, unknown>) => {
        itemMap.set(item.material_id as number, parseFloat(item.quantity as string));
        const mat = item.materials as { name: string; category: string; unit: string } | null;
        saved.push({
          material_id: item.material_id as number,
          quantity: parseFloat(item.quantity as string),
          unit_price: item.unit_price ? parseFloat(item.unit_price as string) : undefined,
          amount: item.amount ? parseFloat(item.amount as string) : undefined,
          prev_quantity: item.prev_quantity ? parseFloat(item.prev_quantity as string) : undefined,
          consumption: item.consumption ? parseFloat(item.consumption as string) : undefined,
          consumption_amount: item.consumption_amount ? parseFloat(item.consumption_amount as string) : undefined,
          material_name: mat?.name || '',
          category: mat?.category || '',
          unit: mat?.unit || '',
        });
      });
      setItems(itemMap);
      setSavedItems(saved);
      setTotalAmount(data.record?.total_amount ? parseFloat(data.record.total_amount) : 0);
    } else {
      setItems(new Map());
      setSavedItems([]);
      setTotalAmount(0);
    }
  }, [type]);

  useEffect(() => {
    loadMaterials();
  }, [loadMaterials]);

  useEffect(() => {
    if (date) {
      loadRecord(date);
    }
  }, [date, loadRecord]);

  // Auto-select first category when materials load
  useEffect(() => {
    if (materials.length > 0 && !selectedCategory) {
      const cats = Array.from(new Set(materials.map(m => m.category)));
      setSelectedCategory(cats[0]);
    }
  }, [materials, selectedCategory]);

  const handleQuantityChange = (materialId: number, value: string) => {
    const num = value === '' ? 0 : parseFloat(value);
    setItems(prev => {
      const next = new Map(prev);
      next.set(materialId, isNaN(num) ? 0 : num);
      return next;
    });
    setMessage('');
  };

  const handleSave = async () => {
    if (!date) {
      setMessage('请选择日期');
      return;
    }

    const itemsList = Array.from(items.entries())
      .filter(([, qty]) => qty > 0)
      .map(([material_id, quantity]) => ({ material_id, quantity }));

    if (itemsList.length === 0) {
      setMessage('请至少录入一项物料数量');
      return;
    }

    setSaving(true);
    try {
      const saveHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = getToken();
      if (token) saveHeaders['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: saveHeaders,
        body: JSON.stringify({
          record_type: type,
          record_date: date,
          items: itemsList,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('保存成功!');
        setTotalAmount(data.total_amount);
        loadRecord(date);
      } else {
        setMessage(data.error || '保存失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setSaving(false);
    }
  };

  // Group materials by category
  const categories = Array.from(new Set(materials.map(m => m.category)));
  const filteredCategories = searchTerm
    ? categories.filter(cat =>
        materials.some(m => m.category === cat && m.name.includes(searchTerm))
      )
    : categories;

  // Current category materials
  const currentMaterials = materials
    .filter(m => m.category === selectedCategory && (!searchTerm || m.name.includes(searchTerm)))
    .sort((a, b) => a.sort_order - b.sort_order);

  const getTodayDate = () => {
    if (type === 'weekly') {
      const now = new Date();
      const year = now.getFullYear();
      const week = Math.ceil(((now.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7);
      return `${year}-W${String(week).padStart(2, '0')}`;
    }
    if (type === 'monthly') {
      return new Date().toISOString().slice(0, 7);
    }
    return new Date().toISOString().split('T')[0];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#E5E5E5', borderTopColor: '#1A1A1A' }} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" style={{ background: '#FAFAFA' }}>
      {/* Fixed Top: Header + Date */}
      <div className="sticky top-0 z-20 px-4 pt-4 pb-2 space-y-3" style={{ background: '#FAFAFA' }}>
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>{title}</h1>
          {totalAmount > 0 && (
            <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
              库存: ¥{totalAmount.toFixed(2)}
            </span>
          )}
        </div>

        {/* Date + Search Row */}
        <div className="flex items-center gap-2">
          <div className="flex-1 bg-white rounded-xl p-2.5 shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
            <div className="flex items-center gap-2">
              <input
                type={type === 'monthly' ? 'month' : type === 'weekly' ? 'text' : 'date'}
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder={datePlaceholder}
                className="flex-1 text-sm outline-none"
                style={{ color: '#333' }}
              />
              <button
                onClick={() => setDate(getTodayDate())}
                className="px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap"
                style={{ background: '#F5F5F5', color: '#1A1A1A' }}
              >
                {type === 'daily' ? '今天' : type === 'weekly' ? '本周' : '本月'}
              </button>
            </div>
          </div>
          <div className="bg-white rounded-xl p-2.5 shadow-sm shrink-0" style={{ border: '1px solid #F0F0F0' }}>
            <svg className="w-5 h-5" style={{ color: '#999' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>

        {/* Search Input */}
        {searchTerm !== undefined && (
          <div className="bg-white rounded-xl px-3 py-2 shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="搜索物料名称..."
              className="w-full text-sm outline-none"
              style={{ color: '#333' }}
            />
          </div>
        )}
      </div>

      {/* Category Tabs - Horizontal Scroll */}
      <div className="sticky z-10 px-4 pb-2" style={{ top: '180px', background: '#FAFAFA' }}>
        <div ref={tabRef} className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {filteredCategories.map(cat => {
            const count = materials.filter(m => m.category === cat && (!searchTerm || m.name.includes(searchTerm))).length;
            const isActive = cat === selectedCategory;
            return (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all shrink-0"
                style={{
                  background: isActive ? '#1A1A1A' : '#F5F5F5',
                  color: isActive ? '#FFFFFF' : '#666',
                }}
              >
                {cat}
                <span className="text-[10px] opacity-60">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Materials List for Selected Category */}
      <div className="flex-1 px-4 pb-4">
        {currentMaterials.length > 0 ? (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #F0F0F0' }}>
            {/* Category Header */}
            <div className="flex items-center justify-between px-4 py-2.5" style={{ borderBottom: '1px solid #F0F0F0', background: '#FAFAFA' }}>
              <span className="text-sm font-semibold" style={{ color: '#333' }}>{selectedCategory}</span>
              <span className="text-xs" style={{ color: '#999' }}>
                {currentMaterials.length}项
              </span>
            </div>

            {/* Material Items */}
            <div className="divide-y" style={{ borderColor: '#F5F5F5' }}>
              {currentMaterials.map(material => {
                const qty = items.get(material.id) || 0;
                const price = material.price ? parseFloat(material.price) : 0;
                const savedItem = savedItems.find(si => si.material_id === material.id);

                return (
                  <div key={material.id} className="px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium" style={{ color: '#333' }}>{material.name}</span>
                        <span className="text-xs ml-1.5" style={{ color: '#999' }}>{material.unit}</span>
                      </div>
                      {price > 0 && (
                        <span className="text-xs ml-2 shrink-0" style={{ color: '#999' }}>¥{price}</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={qty || ''}
                        onChange={(e) => handleQuantityChange(material.id, e.target.value)}
                        placeholder="0"
                        className="flex-1 px-3 py-2.5 rounded-lg border text-base outline-none"
                        style={{ borderColor: '#E5E5E5', color: '#1A1A1A', fontSize: '16px' }}
                        step="0.01"
                        min="0"
                        inputMode="decimal"
                      />
                      {price > 0 && qty > 0 && (
                        <span className="text-sm font-medium whitespace-nowrap" style={{ color: '#1A1A1A' }}>
                          ¥{(qty * price).toFixed(2)}
                        </span>
                      )}
                    </div>
                    {savedItem && savedItem.consumption !== undefined && savedItem.consumption > 0 && (
                      <div className="mt-1.5 flex items-center gap-3 text-xs" style={{ color: '#666' }}>
                        <span>昨日: {savedItem.prev_quantity}</span>
                        <span>消耗: <span style={{ color: '#1A1A1A', fontWeight: 500 }}>{savedItem.consumption}</span></span>
                        <span>¥{savedItem.consumption_amount?.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-32 text-sm" style={{ color: '#999' }}>
            {searchTerm ? '未找到匹配的物料' : '该分类暂无物料'}
          </div>
        )}
      </div>

      {/* Save Button - Fixed at Bottom */}
      <div className="sticky bottom-0 z-20 px-4 pb-4 pt-2" style={{ background: 'linear-gradient(to top, #FAFAFA 60%, transparent)' }}>
        {!date ? (
          <div className="text-center text-xs py-2" style={{ color: '#999' }}>
            请先选择日期，再录入库存数量
          </div>
        ) : (
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-xl text-white font-medium text-sm shadow-lg disabled:opacity-50 active:opacity-90 transition-all"
            style={{ background: '#1A1A1A', minHeight: '44px' }}
          >
            {saving ? '保存中...' : '保存盘点数据'}
          </button>
        )}
      </div>

      {/* Toast Message */}
      {message && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm shadow-lg z-50 animate-fade-in" style={{
          background: message.includes('成功') ? '#F0FDF4' : '#FEF2F2',
          color: message.includes('成功') ? '#16A34A' : '#EF4444',
        }}>
          {message}
        </div>
      )}
    </div>
  );
}