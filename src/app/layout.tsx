import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Miiix Coffee - 物料盘点管理',
  description: 'Miiix Coffee 门店物料库存盘点管理系统',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
