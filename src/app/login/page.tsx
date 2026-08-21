'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/auth/logout', { method: 'POST' });
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();
      if (res.ok) {
        router.push('/dashboard');
      } else {
        setError(data.error || '登录失败');
      }
    } catch {
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #E86825 0%, #F5A623 100%)' }}>
      <div className="w-full max-w-sm mx-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center" style={{ background: '#E86825' }}>
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold" style={{ color: '#1A1A1A' }}>Miiix Coffee</h1>
            <p className="text-sm mt-1" style={{ color: '#666' }}>物料盘点管理系统</p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#333' }}>用户名</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition-all"
                style={{ borderColor: '#E5E5E5' }}
                placeholder="请输入用户名"
                required
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm font-medium mb-1.5" style={{ color: '#333' }}>密码</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg border text-sm outline-none transition-all"
                style={{ borderColor: '#E5E5E5' }}
                placeholder="请输入密码"
                required
              />
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg text-sm text-center" style={{ background: '#FEF2F2', color: '#EF4444' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg text-white font-medium text-sm transition-opacity disabled:opacity-50"
              style={{ background: '#E86825' }}
            >
              {loading ? '登录中...' : '登 录'}
            </button>
          </form>

          <div className="mt-6 text-center text-xs" style={{ color: '#999' }}>
            <p>店长账号: admin / 123456</p>
            <p>店员账号: staff / 123456</p>
          </div>
        </div>
      </div>
    </div>
  );
}
