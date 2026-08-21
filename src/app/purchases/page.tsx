'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../app-layout';

interface Material {
  id: number;
  name: string;
  category: string;
  unit: string;
  price: string | null;
}

interface Purchase {
  id: number;
  material_id: number;
  purchase_date: string;
  quantity: string;
  unit_price: string;
  total_amount: string;
  materials?: { name: string; category: string; unit: string };
}

export default function PurchasesPage() {
  const [materials, setMaterials] = useState<Material[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [materialId, setMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [filterDate, setFilterDate] = useState('');

  useEffect(() => {
    fetch('/api/materials').then(r => r.json()).then(data => {
      setMaterials(data.materials || []);
    }).catch(() => {}).finally(() => setLoading(false));
    loadPurchases();
  }, []);

  const loadPurchases = async () => {
    const params = filterDate ? `?date=${filterDate}` : '';
    const res = await fetch(`/api/purchases${params}`);
    const data = await res.json();
    setPurchases(data.purchases || []);
  };

  useEffect(() => {
    loadPurchases();
  }, [filterDate]);

  const handleMaterialChange = (id: string) => {
    setMaterialId(id);
    const mat = materials.find(m => m.id === parseInt(id));
    if (mat?.price) {
      setUnitPrice(mat.price);
    }
  };

  const handleSave = async () => {
    if (!date || !materialId || !quantity || !unitPrice) {
      setMessage('请填写完整信息');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_id: parseInt(materialId),
          purchase_date: date,
          quantity: parseFloat(quantity),
          unit_price: parseFloat(unitPrice),
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setMessage('进货记录已保存');
        setQuantity('');
        loadPurchases();
      } else {
        setMessage(data.error || '保存失败');
      }
    } catch {
      setMessage('网络错误');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定删除此进货记录?')) return;
    const res = await fetch(`/api/purchases?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      loadPurchases();
    }
  };

  // Group by category
  const categories = Array.from(new Set(materials.map(m => m.category)));

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#E5E5E5', borderTopColor: '#E86825' }} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 py-4 space-y-4">
        <h1 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>进货登记</h1>

        {/* Form */}
        <div className="bg-white rounded-xl p-4 shadow-sm space-y-3" style={{ border: '1px solid #F0F0F0' }}>
          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#666' }}>进货日期</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
              style={{ borderColor: '#E5E5E5' }}
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1" style={{ color: '#666' }}>物料名称</label>
            <select
              value={materialId}
              onChange={(e) => handleMaterialChange(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none bg-white"
              style={{ borderColor: '#E5E5E5' }}
            >
              <option value="">请选择物料</option>
              {categories.map(cat => (
                <optgroup key={cat} label={cat}>
                  {materials.filter(m => m.category === cat).map(m => (
                    <option key={m.id} value={m.id}>{m.name} ({m.unit})</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#666' }}>进货数量</label>
              <input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="数量"
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#E5E5E5' }}
                step="0.01"
                min="0"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1" style={{ color: '#666' }}>进货单价(元)</label>
              <input
                type="number"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                placeholder="单价"
                className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#E5E5E5' }}
                step="0.01"
                min="0"
              />
            </div>
          </div>

          {quantity && unitPrice && (
            <div className="text-right text-sm" style={{ color: '#E86825' }}>
              合计: ¥{(parseFloat(quantity || '0') * parseFloat(unitPrice || '0')).toFixed(2)}
            </div>
          )}

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 rounded-xl text-white font-medium text-sm disabled:opacity-50"
            style={{ background: '#E86825' }}
          >
            {saving ? '保存中...' : '保存进货记录'}
          </button>
        </div>

        {/* Filter */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filterDate}
            onChange={(e) => setFilterDate(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
            style={{ borderColor: '#E5E5E5' }}
          />
          {filterDate && (
            <button onClick={() => setFilterDate('')} className="text-xs px-2" style={{ color: '#E86825' }}>
              清除
            </button>
          )}
        </div>

        {/* Records */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #F0F0F0' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
            <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>进货记录</span>
            <span className="text-xs ml-2" style={{ color: '#999' }}>({purchases.length}条)</span>
          </div>
          {purchases.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: '#999' }}>暂无记录</div>
          ) : (
            <div className="divide-y" style={{ borderColor: '#F5F5F5' }}>
              {purchases.map(p => (
                <div key={p.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium" style={{ color: '#333' }}>
                      {p.materials?.name || '未知物料'}
                    </span>
                    <button onClick={() => handleDelete(p.id)} className="text-xs" style={{ color: '#EF4444' }}>
                      删除
                    </button>
                  </div>
                  <div className="flex items-center justify-between text-xs" style={{ color: '#666' }}>
                    <span>{p.purchase_date} | {p.materials?.category}</span>
                    <span>
                      {p.quantity} x ¥{parseFloat(p.unit_price).toFixed(2)} = <span style={{ color: '#E86825' }}>¥{parseFloat(p.total_amount).toFixed(2)}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {message && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm shadow-lg z-50" style={{
            background: message.includes('已保存') ? '#F0FDF4' : '#FEF2F2',
            color: message.includes('已保存') ? '#16A34A' : '#EF4444',
          }}>
            {message}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
