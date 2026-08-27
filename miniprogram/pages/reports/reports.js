const api = require('../../utils/api');

Page({
  data: {
    startDate: '',
    endDate: '',
    summary: [],
    trend: []
  },

  onLoad(options) {
    // 设置默认日期范围（本月）
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const startDate = firstDay.toISOString().split('T')[0];
    const endDate = now.toISOString().split('T')[0];
    this.setData({ startDate, endDate });
    this.loadReport();
  },

  onStartDateChange(e) {
    this.setData({ startDate: e.detail.value });
  },

  onEndDateChange(e) {
    this.setData({ endDate: e.detail.value });
  },

  async loadReport() {
    const { startDate, endDate } = this.data;
    if (!startDate || !endDate) {
      wx.showToast({ title: '请选择日期范围', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '加载中' });
    try {
      const res = await api.getReports({
        type: 'daily',
        start_date: startDate,
        end_date: endDate
      });
      this.setData({
        summary: res.summary || [],
        trend: res.trend || []
      });
    } catch (err) {
      wx.showToast({ title: '加载失败', icon: 'none' });
    } finally {
      wx.hideLoading();
    }
  }
});