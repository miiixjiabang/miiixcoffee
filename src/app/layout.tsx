import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Miiix Coffee - 物料盘点管理',
  description: 'Miiix Coffee 门店物料库存盘点管理系统',
  manifest: '/manifest.json',
  icons: {
    icon: '/icon.svg',
    apple: '/icon.svg',
  },
  other: {
    'theme-color': '#1A1A1A',
    'mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-capable': 'yes',
    'apple-mobile-web-app-status-bar-style': 'black-translucent',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                    console.log('SW registered:', reg.scope);
                  }).catch(function(err) {
                    console.log('SW failed:', err);
                  });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
