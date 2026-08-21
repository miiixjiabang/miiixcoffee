# Miiix Coffee - 物料盘点管理系统

## 项目概览

咖啡店门店物料库存盘点管理系统，支持日盘/周盘/月盘、进货登记、库存预警、报表分析。

## 技术栈

- **Framework**: Next.js 16 (App Router)
- **Core**: React 19, TypeScript 5
- **UI**: Tailwind CSS 4, 自定义组件 (橙色主题 #E86825)
- **Database**: Supabase (PostgreSQL)
- **Auth**: 自定义 Cookie/Token 认证

## 目录结构

```
src/
├── app/
│   ├── api/                    # API 路由
│   │   ├── auth/login/         # 登录
│   │   ├── auth/logout/        # 登出
│   │   ├── materials/          # 物料管理
│   │   ├── inventory/          # 盘点录入
│   │   ├── purchases/          # 进货登记
│   │   ├── alerts/             # 库存预警
│   │   └── reports/            # 报表中心
│   ├── login/                  # 登录页
│   ├── dashboard/              # 首页仪表盘
│   ├── inventory/
│   │   ├── daily/              # 日盘
│   │   ├── weekly/             # 周盘
│   │   └── monthly/            # 月盘
│   ├── purchases/              # 进货页
│   ├── alerts/                 # 预警页
│   ├── reports/                # 报表页
│   ├── app-layout.tsx          # 应用布局(导航)
│   └── globals.css             # 全局样式
├── components/
│   └── inventory-form.tsx      # 盘点表单组件
├── lib/
│   ├── auth.ts                 # 认证工具
│   └── db.ts                   # 数据库客户端
└── storage/database/
    ├── shared/schema.ts        # Drizzle Schema
    └── supabase-client.ts      # Supabase Client
```

## 数据库表

- `users` - 用户表 (admin/staff)
- `stores` - 门店表 (预留多店)
- `materials` - 物料表 (87项, 7大类)
- `inventory_records` - 盘点记录头
- `inventory_items` - 盘点明细
- `purchase_records` - 进货记录
- `alert_thresholds` - 预警阈值

## 角色权限

- **店长 (admin)**: 全部功能 + 报表 + 预警阈值设置
- **店员 (staff)**: 盘点录入 + 进货登记

## 预置账号

- 店长: admin / 123456
- 店员: staff / 123456

## 开发命令

```bash
pnpm dev          # 开发环境
pnpm build        # 构建
pnpm ts-check     # 类型检查
pnpm lint         # 代码检查
```
