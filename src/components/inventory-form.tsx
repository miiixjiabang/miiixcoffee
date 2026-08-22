'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { getToken } from '@/lib/api';

interface Material {
  id: number;
  name: string;
  category: string;
  unit: string;
  price: number | null;
  is_daily: boolean;
}

interface InventoryItem {
  material_id: number;
  quantity: number;
  unit_price?: number | null;
  amount?: number;
  prev_quantity?: number;
  consumption?: number;
  consumption_amount?: number;
  materials?: { name: string; unit: string; category: string; price?: number | null };
}

interface InventoryRecord {
  id: number;
  record_type: string;
  record_date: string;
  total_amount: number;
  created_at: string;
}

interface InventoryFormProps {
  type: 'daily' | 'weekly' | 'monthly';
  title: string;
  dateLabel?: string;
}

export default function InventoryForm({ type, title, dateLabel }: InventoryFormProps) {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [date, setDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [existingRecord, setExistingRecord] = useState<InventoryRecord | null>(null);
  const [existingItems, setExistingItems] = useState<InventoryItem[]>([]);
  const [purchases, setPurchases] = useState<Record<number, number>>({});
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Load materials
  useEffect(() => {
    const token = getToken();
    if (!token) return;
    
    const materialType = type === 'monthly' ? '' : 'daily';
    const url = materialType ? `/api/materials?type=${materialType}` : '/api/materials';

    setLoading(true);
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => {
        const list = data.materials || [];
        setMaterials(list);
        const cats = [...new Set(list.map((m: Material) => m.category))] as string[];
        setCategories(cats);
        if (cats.length > 0) setSelectedCategory(cats[0]);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [type]);

  // Load existing record
  const loadExistingRecord = useCallback(async (selectedDate: string) => {
    const token = getToken();
    if (!token || !selectedDate) return;

    try {
      const res = await fetch(`/api/inventory?type=${type}&date=${selectedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.record) {
        setExistingRecord(data.record);
        setExistingItems(data.items || []);
        const qtyMap: Record<number, string> = {};
        (data.items || []).forEach((item: InventoryItem) => {
          qtyMap[item.material_id] = String(item.quantity);
        });
        setQuantities(qtyMap);
      } else {
        setExistingRecord(null);
        setExistingItems([]);
        setQuantities({});
      }
    } catch {}
  }, [type]);

  // Load purchases for the week
  const loadPurchases = useCallback(async (selectedDate: string) => {
    if (type !== 'weekly') return;
    const token = getToken();
    if (!token || !selectedDate) return;

    try {
      const res = await fetch(`/api/purchases?start_date=${selectedDate}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      const purchaseMap: Record<number, number> = {};
      (data.purchases || []).forEach((p: any) => {
        purchaseMap[p.material_id] = (purchaseMap[p.material_id] || 0) + p.quantity;
      });
      setPurchases(purchaseMap);
    } catch {}
  }, [type]);

  useEffect(() => {
    if (date) {
      loadExistingRecord(date);
      loadPurchases(date);
    }
  }, [date, loadExistingRecord, loadPurchases]);

  const getItemData = useCallback((materialId: number) => {
    return existingItems.find(item => item.material_id === materialId);
  }, [existingItems]);

  const filteredMaterials = materials.filter(m => {
    const matchesSearch = !searchTerm || m.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || m.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getCategoryCount = (category: string) => {
    return materials.filter(m => m.category === category).length;
  };

  const handleSave = async () => {
    if (!date) {
      setMessage({ type: 'error', text: '请先选择日期' });
      return;
    }

    const token = getToken();
    if (!token) return;

    setSaving(true);
    setMessage(null);

    const items = materials
      .filter(m => quantities[m.id] && quantities[m.id] !== '0')
      .map(m => ({
        material_id: m.id,
        quantity: parseFloat(quantities[m.id]) || 0,
      }));

    if (items.length === 0) {
      setMessage({ type: 'error', text: '请至少录入一项物料数量' });
      setSaving(false);
      return;
    }

    try {
      const body = type === 'weekly'
        ? { week_start: date, items }
        : { record_type: type, record_date: date, items };

      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setMessage({ type: 'success', text: '保存成功！' });
        loadExistingRecord(date);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.error || '保存失败' });
      }
    } catch {
      setMessage({ type: 'error', text: '网络错误' });
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const handleQuantityChange = (materialId: number, value: string) => {
    if (value === '' || /^\d*\.?\d*$/.test(value)) {
      setQuantities(prev => ({ ...prev, [materialId]: value }));
    }
  };

  const getConsumption = (materialId: number) => {
    const item = getItemData(materialId);
    return item?.consumption;
  };

  const getPrevQuantity = (materialId: number) => {
    const item = getItemData(materialId);
    return item?.prev_quantity;
  };

  const formatAmount = (val: number | null | undefined) => {
    if (val == null) return '-';
    return val.toFixed(1);
  };

  // Weekly summary calculations
  const getWeeklySummary = () => {
    if (type !== 'weekly' || !selectedCategory) return null;
    const catMaterials = materials.filter(m => m.category === selectedCategory);
    let totalOpening = 0, totalPurchase = 0, totalClosing = 0;

    catMaterials.forEach(m => {
      const qty = parseFloat(quantities[m.id]) || 0;
      const prev = getPrevQuantity(m.id) || 0;
      const pch = purchases[m.id] || 0;
      totalOpening += prev;
      totalPurchase += pch;
      totalClosing += qty;
    });

    return { opening: totalOpening, purchase: totalPurchase, closing: totalClosing };
  };

  const renderDatePicker = () => (
    <div className="flex items-center gap-2 px-1">
      <div className="flex-1 relative">
        <input
          type="date"
          value={date}
          onChange={e => setDate(e.target.value)}
          className="w-full px-3 py-2.5 rounded-lg text-sm border appearance-none"
          style={{ borderColor: '#E5E5E5', background: '#FAFAFA', fontSize: '16px', color: '#1A1A1A' }}
        />
      </div>
      {type === 'daily' && (
        <button
          onClick={() => {
            const today = new Date().toISOString().split('T')[0];
            setDate(today);
          }}
          className="px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap"
          style={{ background: '#1A1A1A', color: '#FFF' }}
        >
          今天
        </button>
      )}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="w-10 h-10 rounded-lg flex items-center justify-center"
        style={{ background: '#F0F0F0' }}
      >
        <svg className="w-5 h-5" fill="none" stroke="#1A1A1A" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
    </div>
  );

  const renderSearchBar = () => (
    <div className="relative">
      <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" fill="none" stroke="#999" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        ref={searchInputRef}
        type="text"
        placeholder="搜索物料名称..."
        value={searchTerm}
        onChange={e => setSearchTerm(e.target.value)}
        className="w-full pl-9 pr-8 py-2.5 rounded-lg text-sm border"
        style={{ borderColor: '#E5E5E5', background: '#FAFAFA', fontSize: '16px' }}
      />
      {searchTerm && (
        <button
          onClick={() => { setSearchTerm(''); searchInputRef.current?.focus(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2"
        >
          <svg className="w-4 h-4" fill="none" stroke="#999" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
    </div>
  );

  const renderSidebar = () => {
    if (!sidebarOpen) return null;
    return (
      <div className="w-[85px] flex-shrink-0 overflow-y-auto border-r" style={{ background: '#F5F5F5', borderColor: '#E5E5E5' }}>
        {categories.map(cat => {
          const isActive = selectedCategory === cat;
          const count = getCategoryCount(cat);
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className="w-full flex flex-col items-center py-3 px-1 text-center relative"
              style={{
                background: isActive ? '#FFF' : 'transparent',
                borderLeft: isActive ? '3px solid #1A1A1A' : '3px solid transparent',
              }}
            >
              <span className="text-xs font-medium leading-tight" style={{ color: isActive ? '#1A1A1A' : '#666', fontWeight: isActive ? 600 : 400 }}>
                {cat}
              </span>
              <span className="text-[10px] mt-0.5" style={{ color: '#999' }}>
                {count}项
              </span>
            </button>
          );
        })}
      </div>
    );
  };

  const renderMaterialList = () => (
    <div className="flex-1 overflow-y-auto pb-4">
      {/* Category title */}
      <div className="px-3 py-2 flex items-center justify-between">
        <h3 className="text-sm font-bold" style={{ color: '#1A1A1A' }}>
          {selectedCategory || '全部'}
        </h3>
        <span className="text-xs" style={{ color: '#999' }}>
          {filteredMaterials.length}项
        </span>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin w-6 h-6 border-2 rounded-full" style={{ borderColor: '#E5E5E5', borderTopColor: '#1A1A1A' }} />
        </div>
      ) : filteredMaterials.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12">
          <svg className="w-12 h-12 mb-3" fill="none" stroke="#DDD" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span className="text-sm" style={{ color: '#999' }}>暂无物料</span>
        </div>
      ) : (
        <div className="space-y-2 px-3">
          {filteredMaterials.map(material => {
            const item = getItemData(material.id);
            const qty = quantities[material.id] || '';
            const amount = (parseFloat(qty) || 0) * (material.price || 0);
            const consumption = getConsumption(material.id);
            const prevQty = getPrevQuantity(material.id);
            const purchase = purchases[material.id];

            return (
              <div
                key={material.id}
                className="rounded-xl p-3"
                style={{ background: '#FFF', border: '1px solid #F0F0F0' }}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
                      {material.name}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[11px]" style={{ color: '#999' }}>{material.unit}</span>
                      {material.price != null && (
                        <span className="text-[11px]" style={{ color: '#666' }}>
                          ¥{material.price}/{material.unit.split('/').pop()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
                    <input
                      type="number"
                      inputMode="decimal"
                      value={qty}
                      onChange={e => handleQuantityChange(material.id, e.target.value)}
                      placeholder="0"
                      className="w-20 text-right px-3 py-2 rounded-lg text-sm border"
                      style={{ borderColor: '#E5E5E5', fontSize: '16px', color: '#1A1A1A' }}
                    />
                  </div>
                </div>

                {/* Info row */}
                <div className="flex items-center gap-3 text-[11px]" style={{ color: '#999' }}>
                  {prevQty !== undefined && (
                    <span>期初: {formatAmount(prevQty)}</span>
                  )}
                  {purchase !== undefined && purchase > 0 && (
                    <span>进货: +{purchase}</span>
                  )}
                  {amount > 0 && (
                    <span className="font-medium" style={{ color: '#1A1A1A' }}>¥{amount.toFixed(1)}</span>
                  )}
                  {consumption !== undefined && consumption >= 0 && (
                    <span style={{ color: consumption > 0 ? '#1A1A1A' : '#999' }}>
                      消耗: {formatAmount(consumption)}
                    </span>
                  )}
                  {consumption !== undefined && consumption < 0 && (
                    <span style={{ color: '#EF4444' }}>
                      消耗: {formatAmount(consumption)}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Top bar: date + search */}
      <div className="sticky top-0 z-10 bg-white px-3 py-2 space-y-2" style={{ borderBottom: '1px solid #E5E5E5' }}>
        {renderDatePicker()}
        {renderSearchBar()}
      </div>

      {/* Main content: sidebar + material list */}
      <div className="flex flex-1 overflow-hidden">
        {renderSidebar()}
        {renderMaterialList()}
      </div>

      {/* Bottom save bar */}
      <div className="sticky bottom-0 bg-white px-3 py-2" style={{ borderTop: '1px solid #E5E5E5' }}>
        {message && (
          <div className="mb-2 px-3 py-2 rounded-lg text-sm text-center" style={{
            background: message.type === 'success' ? '#F0FDF4' : '#FEF2F2',
            color: message.type === 'success' ? '#166534' : '#991B1B',
          }}>
            {message.text}
          </div>
        )}
        <div className="flex items-center gap-3">
          {existingRecord && (
            <div className="text-xs flex-1" style={{ color: '#999' }}>
              已保存 {existingRecord.created_at.slice(0, 10)}
              {existingRecord.total_amount > 0 && ` · ¥${existingRecord.total_amount}`}
            </div>
          )}
          <button
            onClick={handleSave}
            disabled={saving || !date}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-white disabled:opacity-50"
            style={{ background: '#1A1A1A', minHeight: '44px' }}
          >
            {saving ? '保存中...' : '保存盘点数据'}
          </button>
        </div>
      </div>
    </div>
  );
}