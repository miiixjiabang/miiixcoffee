# DESIGN.md

## 品牌与视觉方向
- Miiix Coffee 门店管理系统，面向咖啡店员的实用工具
- 风格：简洁现代、高效实用、移动端优先

## Design Tokens

### 色彩
- 主色：#E86825（Miiix 品牌橙）
- 辅色：#F5A623（暖金）
- 背景：#FAFAFA / #F5F5F5
- 卡片：#FFFFFF
- 主文字：#1A1A1A
- 次文字：#666666 / #999999
- 成功：#22C55E
- 危险/预警：#EF4444
- 边框：#E5E5E5 / #F0F0F0

### 字体
- 字体族：-apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif
- 标题：16-18px, bold
- 正文：14px, regular
- 辅助文字：12px, regular

### 圆角
- 卡片：12px (rounded-xl)
- 按钮：8-12px
- 输入框：8px

### 间距
- 页面边距：16px
- 卡片内边距：16px
- 元素间距：8-12px

## 布局与响应式
- 移动端优先（手机浏览器操作为主）
- 底部固定导航栏
- 顶部固定 Header
- 卡片式内容布局

## 交互与状态
- 按钮悬停：opacity 变化
- 加载状态：旋转动画
- 消息提示：顶部浮动 toast
- 预警标识：红色圆点 + 数字角标
