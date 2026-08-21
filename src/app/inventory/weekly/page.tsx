'use client';

import { useState, useEffect, useCallback } from 'react';
import AppLayout from '../../app-layout';

interface Material {
  id: number;
  name: string;
  category: string;
  unit: string;
  price: string | null;
  sort_order: number;
}

interface WasteItem {
  material_id: number;
  material_name: string;
  category: string;
  unit: string;
  price: number | null;
  opening_stock: number;
  weekly_purchases: number;
  daily_closing_stock: number;
  theoretical_consumption: number;
  actual_weekly_qty: number | null;
  actual_consumption: number | null;
  waste: number | null;
  waste_amount: number | null;
}

interface WeeklyData {
  week_start: string;
  week_end: string;
  daily_records_count: number;
  has_weekly_count: boolean;
  waste_comparison: WasteItem[];
  materials: Material[];
  summary: {
    total_theoretical_consumption: number;
    total_actual_consumption: number;
    total_waste: number;
    total_waste_amount: number;
  };
}

export default function WeeklyInventoryPage() {
  const [weekStart, setWeekStart] = useState('');
  const [data, setData] = useState<WeeklyData | null>(null);
  const [loading, setLoading] = useState(false);
  const [manualItems, setManualItems] = useState<Map<number, string>>(new Map());
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'summary' | 'manual' | 'waste'>('summary');
  const [messageType, setMessageType] = useState<'success' | 'error'>('success');

  // Set default week start to this Monday
  useEffect(() => {
    const now = new Date();
    const day = now.getDay();
    const diff = day === 0 ? 6 : day - 1; // Monday is 1
    const monday = new Date(now);
    monday.setDate(now.getDate() - diff);
    setWeekStart(monday.toISOString().split('T')[0]);
  }, []);

  const loadWeeklyData = useCallback(async () => {
    if (!weekStart) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory/weekly?week_start=${weekStart}`);
      const result = await res.json();
      if (res.ok) {
        setData(result);
        // Pre-fill manual items from existing weekly count
        if (result.weekly_items && result.weekly_items.length > 0) {
          const itemMap = new Map<number, string>();
          result.weekly_items.forEach((item: Record<string, unknown>) => {
            itemMap.set(item.material_id as number, String(item.quantity));
          });
          setManualItems(itemMap);
        } else {
          setManualItems(new Map());
        }
      } else {
        setMessage(result.error || '查询失败');
        setMessageType('error');
      }
    } catch {
      setMessage('网络错误');
      setMessageType('error');
    } finally {
      setLoading(false);
    }
  }, [weekStart]);

  useEffect(() => {
    if (weekStart) loadWeeklyData();
  }, [weekStart, loadWeeklyData]);

  const handleManualChange = (materialId: number, value: string) => {
    setManualItems(prev => {
      const next = new Map(prev);
      if (value === '') {
        next.delete(materialId);
      } else {
        next.set(materialId, value);
      }
      return next;
    });
  };

  const handleSaveManual = async () => {
    if (!weekStart) {
      setMessage('请选择周次');
      setMessageType('error');
      return;
    }

    const itemsList = Array.from(manualItems.entries())
      .filter(([, qty]) => qty !== '' && parseFloat(qty) > 0)
      .map(([material_id, quantity]) => ({ material_id, quantity: parseFloat(quantity) }));

    if (itemsList.length === 0) {
      setMessage('请至少录入一项物料数量');
      setMessageType('error');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/inventory/weekly', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ week_start: weekStart, items: itemsList }),
      });
      const result = await res.json();
      if (res.ok) {
        setMessage('周盘保存成功!');
        setMessageType('success');
        loadWeeklyData();
        setActiveTab('waste');
      } else {
        setMessage(result.error || '保存失败');
        setMessageType('error');
      }
    } catch {
      setMessage('网络错误');
      setMessageType('error');
    } finally {
      setSaving(false);
    }
  };

  const getWeekLabel = () => {
    if (!weekStart) return '';
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    const fmt = (d: Date) => `${d.getMonth() + 1}月${d.getDate()}日`;
    return `${fmt(start)} - ${fmt(end)}`;
  };

  // Group materials by category
  const categories = data ? Array.from(new Set(data.materials.map(m => m.category))) : [];

  return (
    <AppLayout>
      <div className="px-4 py-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>周盘管理</h1>
          {data && (
            <span className="text-xs" style={{ color: '#999' }}>
              {data.daily_records_count}天日盘数据
            </span>
          )}
        </div>

        {/* Week Selector */}
        <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
          <label className="block text-xs font-medium mb-1.5" style={{ color: '#666' }}>选择周次（周一日期）</label>
          <input
            type="date"
            value={weekStart}
            onChange={(e) => setWeekStart(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg border text-sm outline-none"
            style={{ borderColor: '#E5E5E5' }}
          />
          {weekStart && (
            <p className="text-xs mt-1.5" style={{ color: '#999' }}>
              盘点周期: {getWeekLabel()}
            </p>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => setActiveTab('summary')}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${activeTab === 'summary' ? 'bg-white shadow-sm' : ''}`}
            style={{ color: activeTab === 'summary' ? '#E86825' : '#666' }}
          >
            自动汇总
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${activeTab === 'manual' ? 'bg-white shadow-sm' : ''}`}
            style={{ color: activeTab === 'manual' ? '#E86825' : '#666' }}
          >
            手动盘点
          </button>
          <button
            onClick={() => setActiveTab('waste')}
            className={`flex-1 py-2 text-xs font-medium rounded-md transition-colors ${activeTab === 'waste' ? 'bg-white shadow-sm' : ''}`}
            style={{ color: activeTab === 'waste' ? '#E86825' : '#666' }}
          >
            损耗对比
            {data?.has_weekly_count && data.summary.total_waste !== 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 text-[10px] text-white rounded-full" style={{ backgroundColor: data.summary.total_waste > 0 ? '#EF4444' : '#22C55E' }}>
                {data.summary.total_waste > 0 ? '!' : '✓'}
              </span>
            )}
          </button>
        </div>

        {/* Message */}
        {message && (
          <div className={`px-3 py-2 rounded-lg text-xs font-medium ${
            messageType === 'success' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
          }`}>
            {message}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#E5E5E5', borderTopColor: '#E86825' }} />
          </div>
        ) : !data ? (
          <div className="text-center py-12 text-sm" style={{ color: '#999' }}>请选择周次</div>
        ) : (
          <>
            {/* Tab 1: Auto Summary */}
            {activeTab === 'summary' && (
              <div className="space-y-3">
                {/* Summary Stats */}
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-white rounded-xl p-3 shadow-sm text-center" style={{ border: '1px solid #F0F0F0' }}>
                    <div className="text-xs" style={{ color: '#999' }}>日盘天数</div>
                    <div className="text-lg font-bold" style={{ color: '#1A1A1A' }}>{data.daily_records_count}</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm text-center" style={{ border: '1px solid #F0F0F0' }}>
                    <div className="text-xs" style={{ color: '#999' }}>理论消耗</div>
                    <div className="text-lg font-bold" style={{ color: '#E86825' }}>{data.summary.total_theoretical_consumption.toFixed(1)}</div>
                  </div>
                  <div className="bg-white rounded-xl p-3 shadow-sm text-center" style={{ border: '1px solid #F0F0F0' }}>
                    <div className="text-xs" style={{ color: '#999' }}>周盘状态</div>
                    <div className={`text-lg font-bold ${data.has_weekly_count ? 'text-green-500' : 'text-gray-400'}`}>
                      {data.has_weekly_count ? '已盘点' : '未盘点'}
                    </div>
                  </div>
                </div>

                {/* Daily Consumption Details */}
                <div className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
                  <div className="px-4 py-3 border-b" style={{ borderColor: '#F0F0F0' }}>
                    <h3 className="text-sm font-bold" style={{ color: '#1A1A1A' }}>本周日盘消耗汇总</h3>
                    <p className="text-xs mt-0.5" style={{ color: '#999' }}>系统自动从日盘数据汇总</p>
                  </div>
                  <div className="divide-y" style={{ borderColor: '#F0F0F0' }}>
                    {categories.map(cat => (
                      <div key={cat}>
                        <div className="px-4 py-2 bg-gray-50">
                          <span className="text-xs font-medium" style={{ color: '#666' }}>{cat}</span>
                        </div>
                        {data.waste_comparison
                          .filter(w => w.category === cat)
                          .map(w => (
                            <div key={w.material_id} className="flex items-center justify-between px-4 py-2.5">
                              <div className="flex-1 min-w-0">
                                <span className="text-sm" style={{ color: '#1A1A1A' }}>{w.material_name}</span>
                                <span className="text-xs ml-1" style={{ color: '#999' }}>{w.unit}</span>
                              </div>
                              <div className="flex items-center gap-3 text-xs">
                                <span style={{ color: '#999' }}>期初 {w.opening_stock}</span>
                                <span style={{ color: '#999' }}>进货 +{w.weekly_purchases}</span>
                                <span style={{ color: '#E86825' }}>消耗 {w.theoretical_consumption}</span>
                                <span style={{ color: '#999' }}>期末 {w.daily_closing_stock}</span>
                              </div>
                            </div>
                          ))}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Manual Count */}
            {activeTab === 'manual' && (
              <div className="space-y-3">
                <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
                  <h3 className="text-sm font-bold mb-1" style={{ color: '#1A1A1A' }}>手动周盘录入</h3>
                  <p className="text-xs" style={{ color: '#999' }}>
                    录入{getWeekLabel()}的实际库存数量
                  </p>
                </div>

                {categories.map(cat => (
                  <div key={cat} className="bg-white rounded-xl shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
                    <div className="px-4 py-2 bg-gray-50 rounded-t-xl">
                      <span className="text-xs font-medium" style={{ color: '#666' }}>{cat}</span>
                    </div>
                    <div className="divide-y" style={{ borderColor: '#F0F0F0' }}>
                      {data.materials
                        .filter(m => m.category === cat)
                        .map(m => {
                          const val = manualItems.get(m.id) ?? '';
                          return (
                            <div key={m.id} className="flex items-center px-4 py-2.5 gap-3">
                              <div className="flex-1 min-w-0">
                                <span className="text-sm" style={{ color: '#1A1A1A' }}>{m.name}</span>
                                <span className="text-xs ml-1" style={{ color: '#999' }}>{m.unit}</span>
                              </div>
                              <input
                                type="number"
                                inputMode="decimal"
                                value={val}
                                onChange={(e) => handleManualChange(m.id, e.target.value)}
                                placeholder="0"
                                className="w-20 px-2 py-1.5 text-right text-sm rounded-lg border outline-none"
                                style={{ borderColor: '#E5E5E5' }}
                              />
                            </div>
                          );
                        })}
                    </div>
                  </div>
                ))}

                <button
                  onClick={handleSaveManual}
                  disabled={saving}
                  className="w-full py-3 rounded-xl text-sm font-medium text-white transition-opacity disabled:opacity-50"
                  style={{ backgroundColor: '#E86825' }}
                >
                  {saving ? '保存中...' : data.has_weekly_count ? '更新周盘数据' : '保存周盘数据'}
                </button>
              </div>
            )}

            {/* Tab 3: Waste Comparison */}
            {activeTab === 'waste' && (
              <div className="space-y-3">
                {!data.has_weekly_count ? (
                  <div className="bg-white rounded-xl p-6 shadow-sm text-center" style={{ border: '1px solid #F0F0F0' }}>
                    <div className="text-4xl mb-2">📋</div>
                    <p className="text-sm" style={{ color: '#999' }}>尚未进行周盘手动盘点</p>
                    <p className="text-xs mt-1" style={{ color: '#999' }}>请先在"手动盘点"标签完成周盘录入</p>
                  </div>
                ) : (
                  <>
                    {/* Waste Summary */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-white rounded-xl p-3 shadow-sm text-center" style={{ border: '1px solid #F0F0F0' }}>
                        <div className="text-xs" style={{ color: '#999' }}>理论消耗</div>
                        <div className="text-base font-bold" style={{ color: '#1A1A1A' }}>{data.summary.total_theoretical_consumption.toFixed(1)}</div>
                      </div>
                      <div className="bg-white rounded-xl p-3 shadow-sm text-center" style={{ border: '1px solid #F0F0F0' }}>
                        <div className="text-xs" style={{ color: '#999' }}>实际消耗</div>
                        <div className="text-base font-bold" style={{ color: '#1A1A1A' }}>{data.summary.total_actual_consumption.toFixed(1)}</div>
                      </div>
                      <div className="bg-white rounded-xl p-3 shadow-sm text-center" style={{ border: '1px solid #F0F0F0' }}>
                        <div className="text-xs" style={{ color: '#999' }}>损耗</div>
                        <div className={`text-base font-bold ${data.summary.total_waste > 0 ? 'text-red-500' : data.summary.total_waste < 0 ? 'text-green-500' : ''}`}>
                          {data.summary.total_waste > 0 ? '+' : ''}{data.summary.total_waste.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    {data.summary.total_waste_amount !== 0 && (
                      <div className="bg-white rounded-xl p-3 shadow-sm text-center" style={{ border: '1px solid #F0F0F0' }}>
                        <span className="text-xs" style={{ color: '#999' }}>损耗金额: </span>
                        <span className={`text-sm font-bold ${data.summary.total_waste_amount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          ¥{data.summary.total_waste_amount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Waste Detail Table */}
                    <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #F0F0F0' }}>
                      <div className="px-4 py-3 border-b" style={{ borderColor: '#F0F0F0' }}>
                        <h3 className="text-sm font-bold" style={{ color: '#1A1A1A' }}>损耗明细</h3>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="border-b" style={{ borderColor: '#F0F0F0', backgroundColor: '#FAFAFA' }}>
                              <th className="px-3 py-2 text-left font-medium" style={{ color: '#666' }}>物料</th>
                              <th className="px-2 py-2 text-right font-medium" style={{ color: '#666' }}>期初</th>
                              <th className="px-2 py-2 text-right font-medium" style={{ color: '#666' }}>进货</th>
                              <th className="px-2 py-2 text-right font-medium" style={{ color: '#666' }}>理论消耗</th>
                              <th className="px-2 py-2 text-right font-medium" style={{ color: '#666' }}>实盘库存</th>
                              <th className="px-2 py-2 text-right font-medium" style={{ color: '#666' }}>实际消耗</th>
                              <th className="px-2 py-2 text-right font-medium" style={{ color: '#666' }}>损耗</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y" style={{ borderColor: '#F0F0F0' }}>
                            {data.waste_comparison
                              .filter(w => w.theoretical_consumption > 0 || w.actual_consumption !== null)
                              .map(w => (
                                <tr key={w.material_id} className={w.waste && Math.abs(w.waste) > 0.5 ? 'bg-red-50/50' : ''}>
                                  <td className="px-3 py-2 text-left">
                                    <span style={{ color: '#1A1A1A' }}>{w.material_name}</span>
                                    <span className="text-[10px] ml-1" style={{ color: '#999' }}>{w.unit}</span>
                                  </td>
                                  <td className="px-2 py-2 text-right" style={{ color: '#666' }}>{w.opening_stock}</td>
                                  <td className="px-2 py-2 text-right" style={{ color: '#666' }}>{w.weekly_purchases}</td>
                                  <td className="px-2 py-2 text-right" style={{ color: '#E86825' }}>{w.theoretical_consumption}</td>
                                  <td className="px-2 py-2 text-right" style={{ color: '#666' }}>{w.actual_weekly_qty ?? '-'}</td>
                                  <td className="px-2 py-2 text-right" style={{ color: '#1A1A1A' }}>{w.actual_consumption?.toFixed(1) ?? '-'}</td>
                                  <td className={`px-2 py-2 text-right font-medium ${
                                    w.waste && w.waste > 0.5 ? 'text-red-500' :
                                    w.waste && w.waste < -0.5 ? 'text-green-500' : ''
                                  }`}>
                                    {w.waste !== null ? (w.waste > 0 ? '+' : '') + w.waste.toFixed(1) : '-'}
                                  </td>
                                </tr>
                              ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}