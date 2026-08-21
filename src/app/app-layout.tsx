'use client';

import { useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface User {
  id: number;
  username: string;
  display_name: string;
  role: 'admin' | 'staff';
}

interface AppLayoutProps {
  children: ReactNode;
}

const navItems = [
  { href: '/dashboard', label: '首页', icon: 'home', roles: ['admin', 'staff'] },
  { href: '/inventory/daily', label: '日盘', icon: 'clipboard', roles: ['admin', 'staff'] },
  { href: '/inventory/weekly', label: '周盘', icon: 'calendar', roles: ['admin', 'staff'] },
  { href: '/inventory/monthly', label: '月盘', icon: 'archive', roles: ['admin', 'staff'] },
  { href: '/purchases', label: '进货', icon: 'truck', roles: ['admin', 'staff'] },
  { href: '/alerts', label: '预警', icon: 'alert', roles: ['admin', 'staff'] },
  { href: '/reports', label: '报表', icon: 'chart', roles: ['admin'] },
];

function getIcon(name: string, className: string) {
  const icons: Record<string, ReactNode> = {
    home: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />,
    clipboard: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />,
    calendar: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />,
    archive: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />,
    truck: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a1 1 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0" />,
    alert: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />,
    chart: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />,
  };
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icons[name]}
    </svg>
  );
}

export default function AppLayout({ children }: AppLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    fetch('/api/auth/logout', { method: 'GET' })
      .then(res => {
        if (res.status === 401) {
          router.push('/login');
          return;
        }
        return res.json();
      })
      .then(data => {
        if (data?.user) {
          setUser(data.user);
          // Check alerts
          fetch('/api/alerts').then(r => r.json()).then(d => {
            setAlertCount(d.alert_count || 0);
          }).catch(() => {});
        }
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 rounded-full" style={{ borderColor: '#E5E5E5', borderTopColor: '#E86825' }} />
      </div>
    );
  }

  if (!user) return null;

  const filteredNav = navItems.filter(item => item.roles.includes(user.role));

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#F5F5F5' }}>
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white shadow-sm" style={{ borderBottom: '1px solid #E5E5E5' }}>
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#E86825' }}>
              <span className="text-white font-bold text-sm">M</span>
            </div>
            <span className="font-bold text-base" style={{ color: '#1A1A1A' }}>Miiix Coffee</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs px-2 py-1 rounded-full" style={{ background: user.role === 'admin' ? '#FEF3C7' : '#E0F2FE', color: user.role === 'admin' ? '#92400E' : '#0369A1' }}>
              {user.role === 'admin' ? '店长' : '店员'}
            </span>
            <span className="text-sm" style={{ color: '#666' }}>{user.display_name}</span>
            <button onClick={handleLogout} className="text-xs px-2 py-1 rounded" style={{ color: '#999' }}>
              退出
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 pb-20">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t" style={{ borderColor: '#E5E5E5' }}>
        <div className="flex justify-around items-center h-16 max-w-lg mx-auto">
          {filteredNav.map(item => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const badge = item.icon === 'alert' && alertCount > 0 ? alertCount : 0;
            return (
              <button
                key={item.href}
                onClick={() => router.push(item.href)}
                className="flex flex-col items-center gap-0.5 px-2 py-1 relative"
              >
                {getIcon(item.icon, `w-5 h-5 ${isActive ? '' : ''}`)}
                <span className="text-xs" style={{ color: isActive ? '#E86825' : '#999', fontWeight: isActive ? 600 : 400 }}>
                  {item.label}
                </span>
                {badge > 0 && (
                  <span className="absolute -top-0.5 right-0 w-4 h-4 rounded-full text-white text-xs flex items-center justify-center" style={{ background: '#EF4444', fontSize: '10px' }}>
                    {badge > 9 ? '9+' : badge}
                  </span>
                )}
                {isActive && (
                  <div className="absolute -top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{ background: '#E86825' }} />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
