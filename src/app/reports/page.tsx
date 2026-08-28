'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../app-layout';
import { getToken } from '@/lib/api';

interface SummaryItem {
  date: string;
  total_amount: number;
  total_consumption: number;
  items: number;
}

interface TrendItem {
  material_id: number;
  name: string;
  category: string;
  data: Record<string, number>;
}

export default function ReportsPage() {
  const [type, setType] = useState<'daily' | 'weekly' | 'monthly'>('daily');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [summary, setSummary] = useState<SummaryItem[]>([]);
  const [trend, setTrend] = useState<TrendItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [recordsCount, setRecordsCount] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [weekStart, setWeekStart] = useState('');
  const [wasteData, setWasteData] = useState<any>(null);
  const [wasteLoading, setWasteLoading] = useState(false);

  useEffect(() => {
    // Set default date range (last 30 days)
    const end = new Date().toISOString().split('T')[0];
    const start = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
    setStartDate(start);
    setEndDate(end);
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      loadReports();
    }
  }, [type, startDate, endDate]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports?type=${type}&start_date=${startDate}&end_date=${endDate}`, {
        headers: getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {}
      });
      const data = await res.json();
      setSummary(data.summary || []);
      setTrend(data.trend || []);
      setRecordsCount(data.records_count || 0);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const categories = Array.from(new Set(trend.map(t => t.category)));
  const filteredTrend = selectedCategory
    ? trend.filter(t => t.category === selectedCategory)
    : trend;

  const exportCSV = async (exportType: string) => {
    const token = getToken();
    const url = `/api/reports/export?type=${exportType}&start_date=${startDate}&end_date=${endDate}`;
    try {
      const res = await fetch(url, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || '导出失败');
        return;
      }
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `miiix_${exportType}_${startDate}_${endDate}.xlsx`;
      a.click();
      window.URL.revokeObjectURL(blobUrl);
    } catch {
      alert('导出失败，请重试');
    }
  };

  // Calculate totals
  const totalAmount = summary.reduce((sum, s) => sum + s.total_amount, 0);
  const totalConsumption = summary.reduce((sum, s) => sum + s.total_consumption, 0);
  const avgAmount = summary.length > 0 ? totalAmount / summary.length : 0;

  // Chart data for simple bar chart
  const maxAmount = Math.max(...summary.map(s => s.total_amount), 1);

  return (
    <AppLayout>
      <div className="px-4 py-4 space-y-4">
        <h1 className="text-lg font-bold" style={{ color: '#1A1A1A' }}>报表中心</h1>

        {/* Type Selector */}
        <div className="flex gap-2">
          {(['daily', 'weekly', 'monthly'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: type === t ? '#1A1A1A' : '#F5F5F5',
                color: type === t ? '#fff' : '#666',
              }}
            >
              {t === 'daily' ? '日报' : t === 'weekly' ? '周报' : '月报'}
            </button>
          ))}
        </div>

        {/* Date Range */}
        <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs mb-1" style={{ color: '#666' }}>开始日期</label>
              <input
                type={type === 'monthly' ? 'month' : 'date'}
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#E5E5E5' }}
              />
            </div>
            <div>
              <label className="block text-xs mb-1" style={{ color: '#666' }}>结束日期</label>
              <input
                type={type === 'monthly' ? 'month' : 'date'}
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#E5E5E5' }}
              />
            </div>
          </div>
          {summary.length > 0 && (
            <div className="flex flex-col gap-2 mt-3">
              <button
                onClick={() => exportCSV('summary')}
                className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity"
                style={{ background: '#1A1A1A', color: '#fff' }}
              >
                导出消耗汇总
              </button>
              <button
                onClick={() => exportCSV(type)}
                className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity"
                style={{ background: '#333', color: '#fff' }}
              >
                导出{type === 'daily' ? '日盘' : type === 'weekly' ? '周盘' : '月盘'}底表
              </button>
            </div>
          )}
        </div>

        {/* Weekly Waste Comparison Section */}
        {type === 'weekly' && (
          <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
            <h3 className="text-sm font-bold mb-2" style={{ color: '#1A1A1A' }}>周损耗对比</h3>
            <p className="text-xs mb-3" style={{ color: '#999' }}>选择周次查看理论消耗与实际消耗的差异</p>
            <div className="flex items-center gap-3">
              <input
                type="date"
                value={weekStart}
                onChange={(e) => setWeekStart(e.target.value)}
                placeholder="周一日期"
                className="flex-1 px-3 py-2 rounded-lg border text-sm outline-none"
                style={{ borderColor: '#E5E5E5' }}
              />
              <button
                onClick={async () => {
                  if (!weekStart) return;
                  setWasteLoading(true);
                  try {
                    const res = await fetch(`/api/inventory/weekly?week_start=${weekStart}`, {
        headers: getToken() ? { 'Authorization': `Bearer ${getToken()}` } : {}
      });
                    const data = await res.json();
                    setWasteData(data);
                  } catch {
                    setWasteData(null);
                  } finally {
                    setWasteLoading(false);
                  }
                }}
                disabled={!weekStart || wasteLoading}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white transition-opacity disabled:opacity-50"
                style={{ backgroundColor: '#1A1A1A' }}
              >
                {wasteLoading ? '查询中...' : '查询'}
              </button>
            </div>

            {wasteData && (
              <div className="mt-4 space-y-3">
                {wasteData.has_weekly_count ? (
                  <>
                    {/* Waste Summary Cards */}
                    <div className="grid grid-cols-3 gap-2">
                      <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                        <div className="text-[10px]" style={{ color: '#999' }}>理论消耗</div>
                        <div className="text-sm font-bold" style={{ color: '#1A1A1A' }}>{wasteData.summary.total_theoretical_consumption.toFixed(1)}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                        <div className="text-[10px]" style={{ color: '#999' }}>实际消耗</div>
                        <div className="text-sm font-bold" style={{ color: '#1A1A1A' }}>{wasteData.summary.total_actual_consumption.toFixed(1)}</div>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                        <div className="text-[10px]" style={{ color: '#999' }}>损耗</div>
                        <div className={`text-sm font-bold ${wasteData.summary.total_waste > 0 ? 'text-red-500' : wasteData.summary.total_waste < 0 ? 'text-green-500' : ''}`}>
                          {wasteData.summary.total_waste > 0 ? '+' : ''}{wasteData.summary.total_waste.toFixed(1)}
                        </div>
                      </div>
                    </div>

                    {wasteData.summary.total_waste_amount !== 0 && (
                      <div className="bg-gray-50 rounded-lg p-2.5 text-center">
                        <span className="text-[10px]" style={{ color: '#999' }}>损耗金额: </span>
                        <span className={`text-sm font-bold ${wasteData.summary.total_waste_amount > 0 ? 'text-red-500' : 'text-green-500'}`}>
                          ¥{wasteData.summary.total_waste_amount.toFixed(2)}
                        </span>
                      </div>
                    )}

                    {/* Waste Detail Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b" style={{ borderColor: '#F0F0F0', backgroundColor: '#FAFAFA' }}>
                            <th className="px-2 py-1.5 text-left font-medium" style={{ color: '#666' }}>物料</th>
                            <th className="px-2 py-1.5 text-right font-medium" style={{ color: '#666' }}>分类</th>
                            <th className="px-2 py-1.5 text-right font-medium" style={{ color: '#666' }}>理论消耗</th>
                            <th className="px-2 py-1.5 text-right font-medium" style={{ color: '#666' }}>实际消耗</th>
                            <th className="px-2 py-1.5 text-right font-medium" style={{ color: '#666' }}>损耗</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y" style={{ borderColor: '#F0F0F0' }}>
                          {wasteData.waste_comparison
                            .filter((w: any) => w.theoretical_consumption > 0 || w.actual_consumption !== null)
                            .map((w: any) => (
                              <tr key={w.material_id} className={w.waste && Math.abs(w.waste) > 0.5 ? 'bg-red-50/50' : ''}>
                                <td className="px-2 py-1.5 text-left" style={{ color: '#1A1A1A' }}>{w.material_name}</td>
                                <td className="px-2 py-1.5 text-right" style={{ color: '#999' }}>{w.category}</td>
                                <td className="px-2 py-1.5 text-right" style={{ color: '#1A1A1A' }}>{w.theoretical_consumption}</td>
                                <td className="px-2 py-1.5 text-right" style={{ color: '#1A1A1A' }}>{w.actual_consumption?.toFixed(1) ?? '-'}</td>
                                <td className={`px-2 py-1.5 text-right font-medium ${
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
                  </>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs" style={{ color: '#999' }}>该周尚未进行手动周盘盘点</p>
                    <p className="text-[10px] mt-0.5" style={{ color: '#bbb' }}>请在周盘管理页面完成手动盘点后查看损耗对比</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin w-6 h-6 border-2 rounded-full" style={{ borderColor: '#E5E5E5', borderTopColor: '#1A1A1A' }} />
          </div>
        ) : recordsCount === 0 ? (
          <div className="bg-white rounded-xl p-8 text-center shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
            <p className="text-sm" style={{ color: '#999' }}>该时间段暂无盘点数据</p>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-white rounded-xl p-3 shadow-sm text-center" style={{ border: '1px solid #F0F0F0' }}>
                <div className="text-xs" style={{ color: '#999' }}>总库存金额</div>
                <div className="text-base font-bold mt-1" style={{ color: '#1A1A1A' }}>¥{totalAmount.toFixed(0)}</div>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm text-center" style={{ border: '1px solid #F0F0F0' }}>
                <div className="text-xs" style={{ color: '#999' }}>总消耗金额</div>
                <div className="text-base font-bold mt-1" style={{ color: '#3B82F6' }}>¥{totalConsumption.toFixed(0)}</div>
              </div>
              <div className="bg-white rounded-xl p-3 shadow-sm text-center" style={{ border: '1px solid #F0F0F0' }}>
                <div className="text-xs" style={{ color: '#999' }}>平均金额</div>
                <div className="text-base font-bold mt-1" style={{ color: '#22C55E' }}>¥{avgAmount.toFixed(0)}</div>
              </div>
            </div>

            {/* Bar Chart */}
            <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
              <div className="text-sm font-semibold mb-3" style={{ color: '#333' }}>库存金额趋势</div>
              <div className="flex items-end gap-1 h-32">
                {summary.map((item, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t transition-all"
                      style={{
                        height: `${Math.max((item.total_amount / maxAmount) * 100, 4)}%`,
                        background: `linear-gradient(to top, #1A1A1A, #666666)`,
                        minWidth: '8px',
                      }}
                      title={`${item.date}: ¥${item.total_amount.toFixed(2)}`}
                    />
                    <span className="text-xs truncate w-full text-center" style={{ color: '#999', fontSize: '9px' }}>
                      {item.date.slice(-5)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Consumption Chart */}
            <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
              <div className="text-sm font-semibold mb-3" style={{ color: '#333' }}>消耗金额趋势</div>
              <div className="flex items-end gap-1 h-32">
                {summary.map((item, i) => {
                  const maxCon = Math.max(...summary.map(s => s.total_consumption), 1);
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div
                        className="w-full rounded-t transition-all"
                        style={{
                          height: `${Math.max((item.total_consumption / maxCon) * 100, 4)}%`,
                          background: `linear-gradient(to top, #3B82F6, #93C5FD)`,
                          minWidth: '8px',
                        }}
                        title={`${item.date}: ¥${item.total_consumption.toFixed(2)}`}
                      />
                      <span className="text-xs truncate w-full text-center" style={{ color: '#999', fontSize: '9px' }}>
                        {item.date.slice(-5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Daily Detail Table */}
            <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #F0F0F0' }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
                <span className="text-sm font-semibold" style={{ color: '#333' }}>每日明细</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr style={{ background: '#FAFAFA' }}>
                      <th className="px-3 py-2 text-left font-medium" style={{ color: '#666' }}>日期</th>
                      <th className="px-3 py-2 text-right font-medium" style={{ color: '#666' }}>库存金额</th>
                      <th className="px-3 py-2 text-right font-medium" style={{ color: '#666' }}>消耗金额</th>
                      <th className="px-3 py-2 text-right font-medium" style={{ color: '#666' }}>物料数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: '#F5F5F5' }}>
                    {summary.map((item, i) => (
                      <tr key={i}>
                        <td className="px-3 py-2" style={{ color: '#333' }}>{item.date}</td>
                        <td className="px-3 py-2 text-right" style={{ color: '#1A1A1A' }}>¥{item.total_amount.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right" style={{ color: '#3B82F6' }}>¥{item.total_consumption.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right" style={{ color: '#666' }}>{item.items}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Material Consumption */}
            {filteredTrend.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #F0F0F0' }}>
                <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid #F0F0F0' }}>
                  <span className="text-sm font-semibold" style={{ color: '#333' }}>物料消耗排行</span>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="text-xs px-2 py-1 rounded border outline-none bg-white"
                    style={{ borderColor: '#E5E5E5' }}
                  >
                    <option value="">全部分类</option>
                    {categories.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
                <div className="divide-y" style={{ borderColor: '#F5F5F5' }}>
                  {filteredTrend
                    .map(t => ({
                      ...t,
                      totalCon: Object.values(t.data).reduce((s, v) => s + v, 0),
                    }))
                    .sort((a, b) => b.totalCon - a.totalCon)
                    .slice(0, 20)
                    .map((item, i) => (
                      <div key={item.material_id} className="px-4 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-5 text-center" style={{ color: '#999' }}>{i + 1}</span>
                          <div>
                            <span className="text-sm" style={{ color: '#333' }}>{item.name}</span>
                            <span className="text-xs ml-1.5" style={{ color: '#999' }}>{item.category}</span>
                          </div>
                        </div>
                        <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
                          {item.totalCon.toFixed(1)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </AppLayout>
  );
}
