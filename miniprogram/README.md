# Miiix Coffee 微信小程序

## 快速开始

### 1. 注册小程序账号
- 访问 https://mp.weixin.qq.com/
- 注册小程序账号（需要企业/个体户资质，或个人账号）
- 获取 **AppID**

### 2. 安装微信开发者工具
- 下载地址：https://developers.weixin.qq.com/miniprogram/dev/devtools/download.html
- 安装后用小程序账号登录

### 3. 配置项目
1. 打开微信开发者工具
2. 选择「导入项目」
3. 项目目录选择 `miniprogram/` 文件夹
4. AppID 填入你注册的 AppID
5. 点击「导入」

### 4. 修改 API 地址
打开 `app.js`，修改 `baseUrl` 为你的实际 API 地址：
```javascript
baseUrl: 'https://你的域名'
```

### 5. 添加 Tab Bar 图标
在 `assets/` 目录下添加以下图标文件（81x81 像素 PNG）：
- `icon-home.png` / `icon-home-active.png`
- `icon-daily.png` / `icon-daily-active.png`
- `icon-purchase.png` / `icon-purchase-active.png`
- `icon-alert.png` / `icon-alert-active.png`

### 6. 预览和上传
- 在开发者工具中点击「预览」可在手机上查看
- 点击「上传」可提交到微信后台
- 在微信后台提交审核，审核通过后即可发布

## 功能模块

| 页面 | 功能 |
|------|------|
| 登录 | 账号密码登录 |
| 首页 | 快捷入口、待审核提醒、今日统计 |
| 日盘 | 35项物料盘点录入 |
| 周盘 | 周盘点录入 + 损耗对比 |
| 月盘 | 88项全量物料盘点 |
| 进货 | 进货登记 |
| 预警 | 库存预警查看和阈值设置 |
| 报表 | 消耗汇总和趋势（仅店长） |

## 权限说明

- **店长(admin)**: 全部功能 + 报表 + 预警设置 + 审核归档
- **店员(staff)**: 盘点录入 + 进货登记

## 注意事项

- 小程序需要 HTTPS 域名，确保 API 地址是 HTTPS
- 需要在小程序后台配置服务器域名白名单
- 开发阶段可以在开发者工具中关闭域名校验