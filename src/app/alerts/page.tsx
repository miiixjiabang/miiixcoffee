'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../app-layout';
import { getToken } from '@/lib/api';

interface ThresholdItem {
  id: number;
  material_id: number;
  material_name: string;
  category: string;
  unit: string;
  threshold: number;
  current_stock: number;
  is_alert: boolean;
}

export default function AlertsPage() {
  const [thresholds, setThresholds] = useState<ThresholdItem[]>([]);
  const [alertCount, setAlertCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);
  const [filter, setFilter] = useState<'all' | 'alert'>('alert');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    Promise.all([
      fetch('/api/alerts', { headers }).then(r => r.json()),
      fetch('/api/alerts', { headers }).then(r => r.json()),
    ]).then(([alertData, _]) => {
      setThresholds(alertData.thresholds || []);
      setAlertCount(alertData.alert_count || 0);
      // Check user role from localStorage
      try {
        const user = JSON.parse(localStorage.getItem('miiix_user') || '{}');
        setIsAdmin(user.role === 'admin');
      } catch {
        setIsAdmin(false);
      }
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const handleSaveThreshold = async (materialId: number) => {
    const value = parseFloat(editValue);
    if (isNaN(value) || value < 0) {
      setMessage('请输入有效的阈值');
      return;
    }

    try {
      const saveHeaders: Record<string, string> = { 'Content-Type': 'application/json' };
      const token = getToken();
      if (token) saveHeaders['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/alerts', {
        method: 'POST',
        headers: saveHeaders,
        body: JSON.stringify({ material_id: materialId, threshold: value }),
      });

      if (res.ok) {
        setMessage('阈值已更新');
        setEditingId(null);
        // Reload
        const reloadHeaders: Record<string, string> = {};
        const t = getToken();
        if (t) reloadHeaders['Authorization'] = `Bearer ${t}`;
        const data = await fetch('/api/alerts', { headers: reloadHeaders }).then(r => r.json());
        setThresholds(data.thresholds || []);
        setAlertCount(data.alert_count || 0);
      }
    } catch {
      setMessage('保存失败');
    }
  };

  const filteredThresholds = filter === 'alert'
    ? thresholds.filter(t => t.is_alert)
    : thresholds;

  // Group by category
  const categories = Array.from(new Set(filteredThresholds.map(t => t.category)));

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#E5E5E5', borderTopColor: '#1A1A1A' }} />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="px-4 py-4 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>库存预警</h1>
          <span className="text-sm px-2 py-1 rounded-full" style={{
            background: alertCount > 0 ? '#FEF2F2' : '#F0FDF4',
            color: alertCount > 0 ? '#EF4444' : '#22C55E',
          }}>
            {alertCount} 项预警
          </span>
        </div>

        {/* Filter */}
        <div className="flex gap-2">
          <button
            onClick={() => setFilter('alert')}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: filter === 'alert' ? '#1A1A1A' : '#F5F5F5',
              color: filter === 'alert' ? '#fff' : '#666',
            }}
          >
            仅预警 ({alertCount})
          </button>
          <button
            onClick={() => setFilter('all')}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{
              background: filter === 'all' ? '#1A1A1A' : '#F5F5F5',
              color: filter === 'all' ? '#fff' : '#666',
            }}
          >
            全部阈值
          </button>
        </div>

        {filteredThresholds.length === 0 && (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
            <div className="text-3xl mb-2">
              {filter === 'alert' ? '>' : '>'}
            </div>
            <p className="text-sm" style={{ color: '#999' }}>
              {filter === 'alert' ? '暂无预警物料' : '暂未设置预警阈值'}
            </p>
            {isAdmin && filter === 'all' && (
              <p className="text-xs mt-1" style={{ color: '#999' }}>点击下方物料设置预警阈值</p>
            )}
          </div>
        )}

        {categories.map(category => {
          const items = filteredThresholds.filter(t => t.category === category);
          if (items.length === 0) return null;

          return (
            <div key={category} className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #F0F0F0' }}>
              <div className="px-4 py-2.5" style={{ borderBottom: '1px solid #F0F0F0', background: '#FAFAFA' }}>
                <span className="text-sm font-semibold" style={{ color: '#333' }}>{category}</span>
                <span className="text-xs ml-2" style={{ color: '#999' }}>{items.length}项</span>
              </div>
              <div className="divide-y" style={{ borderColor: '#F5F5F5' }}>
                {items.map(item => (
                  <div key={item.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm" style={{ color: '#333' }}>{item.material_name}</span>
                          {item.is_alert && (
                            <span className="w-2 h-2 rounded-full" style={{ background: '#EF4444' }} />
                          )}
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs" style={{ color: '#666' }}>
                          <span>当前: <span style={{ color: item.is_alert ? '#EF4444' : '#333', fontWeight: 600 }}>{item.current_stock}</span></span>
                          <span>阈值: {item.threshold}</span>
                        </div>
                      </div>
                      {isAdmin && (
                        <button
                          onClick={() => {
                            setEditingId(item.material_id);
                            setEditValue(String(item.threshold));
                          }}
                          className="text-xs px-2 py-1 rounded"
                          style={{ background: '#F5F5F5', color: '#1A1A1A' }}
                        >
                          设置
                        </button>
                      )}
                    </div>
                    {editingId === item.material_id && (
                      <div className="mt-2 flex items-center gap-2">
                        <input
                          type="number"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 px-2 py-1.5 rounded border text-sm outline-none"
                          style={{ borderColor: '#E5E5E5' }}
                          placeholder="预警阈值"
                          step="0.1"
                          min="0"
                        />
                        <button
                          onClick={() => handleSaveThreshold(item.material_id)}
                          className="text-xs px-3 py-1.5 rounded text-white"
                          style={{ background: '#1A1A1A' }}
                        >
                          保存
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="text-xs px-2 py-1.5 rounded"
                          style={{ color: '#999' }}
                        >
                          取消
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {message && (
          <div className="fixed top-16 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg text-sm shadow-lg z-50" style={{
            background: '#F0FDF4',
            color: '#16A34A',
          }}>
            {message}
          </div>
        )}
      </div>
    </AppLayout>
  );
}
