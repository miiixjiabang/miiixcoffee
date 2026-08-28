const api = require('../../utils/api');
const auth = require('../../utils/auth');

Page({
  data: {
    user: null,
    pendingCount: 0,
    todayRecords: 0,
    todayAmount: 0,
    recentRecords: []
  },

  onShow() {
    const app = getApp();
    if (!auth.checkLogin()) {
      wx.redirectTo({ url: '/pages/login/login' });
      return;
    }
    this.setData({ user: app.globalData.user });
    this.loadData();
  },

  async loadData() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const [inventoryRes, alertsRes] = await Promise.all([
        api.getInventory({ type: 'daily', date: today }),
        api.getAlerts()
      ]);

      const records = inventoryRes.records || [];
      this.setData({
        todayRecords: records.length,
        todayAmount: records.reduce((sum, r) => sum + (r.total_amount || 0), 0),
        recentRecords: records.slice(0, 5)
      });

      if (this.data.user.role === 'admin') {
        const pendingRes = await api.getInventory({ status: 'pending' });
        this.setData({ pendingCount: pendingRes.total || 0 });
      }
    } catch (err) {
      console.error('加载数据失败:', err);
    }
  },

  handleLogout() {
    wx.showModal({
      title: '确认退出',
      content: '确定要退出登录吗？',
      success(res) {
        if (res.confirm) {
          auth.logout();
          wx.redirectTo({ url: '/pages/login/login' });
        }
      }
    });
  },

  goToDaily() { wx.switchTab({ url: '/pages/inventory/daily/daily' }); },
  goToWeekly() { wx.navigateTo({ url: '/pages/inventory/weekly/weekly' }); },
  goToMonthly() { wx.navigateTo({ url: '/pages/inventory/monthly/monthly' }); },
  goToPurchases() { wx.switchTab({ url: '/pages/purchases/purchases' }); },
  goToReports() { wx.switchTab({ url: '/pages/reports/reports' }); },
  goToPending() { wx.navigateTo({ url: '/pages/reports/reports?tab=pending' }); }
});