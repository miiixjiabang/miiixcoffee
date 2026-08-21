'use client';

import { useState, useEffect } from 'react';
import AppLayout from '../app-layout';
import { getToken } from '@/lib/api';

interface AlertItem {
  material_id: number;
  material_name: string;
  category: string;
  unit: string;
  threshold: number;
  current_stock: number;
}

interface InventoryRecord {
  id: number;
  record_type: string;
  record_date: string;
  total_amount: string;
  created_at: string;
}

export default function DashboardPage() {
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [recentDaily, setRecentDaily] = useState<InventoryRecord[]>([]);
  const [recentMonthly, setRecentMonthly] = useState<InventoryRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;

    Promise.all([
      fetch('/api/alerts', { headers }).then(r => r.json()),
      fetch('/api/inventory?type=daily', { headers }).then(r => r.json()),
      fetch('/api/inventory?type=monthly', { headers }).then(r => r.json()),
    ]).then(([alertData, dailyData, monthlyData]) => {
      setAlerts(alertData.alerts || []);
      setRecentDaily((dailyData.records || []).slice(0, 5));
      setRecentMonthly((monthlyData.records || []).slice(0, 5));
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#E5E5E5', borderTopColor: '#1A1A1A' }} />
        </div>
      </AppLayout>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <AppLayout>
      <div className="px-4 py-4 space-y-4">
        {/* Quick Actions */}
        <div className="grid grid-cols-3 gap-3">
          <a href="/inventory/daily" className="bg-white rounded-xl p-4 text-center shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center" style={{ background: '#F5F5F5' }}>
              <svg className="w-5 h-5" style={{ color: '#1A1A1A' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <span className="text-xs font-medium" style={{ color: '#333' }}>日盘录入</span>
          </a>
          <a href="/inventory/weekly" className="bg-white rounded-xl p-4 text-center shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center" style={{ background: '#EFF6FF' }}>
              <svg className="w-5 h-5" style={{ color: '#3B82F6' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <span className="text-xs font-medium" style={{ color: '#333' }}>周盘录入</span>
          </a>
          <a href="/inventory/monthly" className="bg-white rounded-xl p-4 text-center shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
            <div className="w-10 h-10 mx-auto mb-2 rounded-lg flex items-center justify-center" style={{ background: '#F0FDF4' }}>
              <svg className="w-5 h-5" style={{ color: '#22C55E' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </div>
            <span className="text-xs font-medium" style={{ color: '#333' }}>月盘录入</span>
          </a>
        </div>

        {/* Alert Section */}
        {alerts.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #F0F0F0' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: '#EF4444' }} />
                <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>库存预警</span>
              </div>
              <a href="/alerts" className="text-xs" style={{ color: '#1A1A1A' }}>查看全部</a>
            </div>
            <div className="divide-y" style={{ borderColor: '#F5F5F5' }}>
              {alerts.slice(0, 5).map((alert, i) => (
                <div key={i} className="px-4 py-2.5 flex items-center justify-between">
                  <div>
                    <span className="text-sm" style={{ color: '#333' }}>{alert.material_name}</span>
                    <span className="text-xs ml-2" style={{ color: '#999' }}>{alert.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-medium" style={{ color: '#EF4444' }}>{alert.current_stock}</span>
                    <span className="text-xs" style={{ color: '#999' }}> / {alert.threshold}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Today's Date */}
        <div className="bg-white rounded-xl p-4 shadow-sm" style={{ border: '1px solid #F0F0F0' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>今日信息</span>
            <span className="text-xs" style={{ color: '#999' }}>{today}</span>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <a href="/purchases" className="p-3 rounded-lg" style={{ background: '#F5F5F5' }}>
              <div className="text-lg font-bold" style={{ color: '#1A1A1A' }}>进货登记</div>
              <div className="text-xs mt-0.5" style={{ color: '#999' }}>记录今日进货</div>
            </a>
            <a href="/alerts" className="p-3 rounded-lg" style={{ background: alerts.length > 0 ? '#FEF2F2' : '#F0FDF4' }}>
              <div className="text-lg font-bold" style={{ color: alerts.length > 0 ? '#EF4444' : '#22C55E' }}>
                {alerts.length}
              </div>
              <div className="text-xs mt-0.5" style={{ color: '#999' }}>预警物料</div>
            </a>
          </div>
        </div>

        {/* Recent Records */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #F0F0F0' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
            <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>最近日盘记录</span>
          </div>
          {recentDaily.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: '#999' }}>暂无记录</div>
          ) : (
            <div className="divide-y" style={{ borderColor: '#F5F5F5' }}>
              {recentDaily.map(record => (
                <a key={record.id} href={`/inventory/daily?date=${record.record_date}`} className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#333' }}>{record.record_date}</span>
                  <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
                    ¥{parseFloat(record.total_amount || '0').toFixed(2)}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm overflow-hidden" style={{ border: '1px solid #F0F0F0' }}>
          <div className="px-4 py-3" style={{ borderBottom: '1px solid #F0F0F0' }}>
            <span className="text-sm font-semibold" style={{ color: '#1A1A1A' }}>最近月盘记录</span>
          </div>
          {recentMonthly.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm" style={{ color: '#999' }}>暂无记录</div>
          ) : (
            <div className="divide-y" style={{ borderColor: '#F5F5F5' }}>
              {recentMonthly.map(record => (
                <a key={record.id} href={`/inventory/monthly?date=${record.record_date}`} className="px-4 py-3 flex items-center justify-between">
                  <span className="text-sm" style={{ color: '#333' }}>{record.record_date}</span>
                  <span className="text-sm font-medium" style={{ color: '#1A1A1A' }}>
                    ¥{parseFloat(record.total_amount || '0').toFixed(2)}
                  </span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
