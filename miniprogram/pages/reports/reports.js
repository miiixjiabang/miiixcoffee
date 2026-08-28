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
  },

  // 导出 CSV
  async exportCSV(e) {
    const exportType = e.currentTarget.dataset.type;
    const { startDate, endDate } = this.data;
    if (!startDate || !endDate) {
      wx.showToast({ title: '请选择日期范围', icon: 'none' });
      return;
    }

    wx.showLoading({ title: '导出中' });
    try {
      const token = wx.getStorageSync('token');
      const url = `${api.baseUrl}/api/reports/export?type=${exportType}&start_date=${startDate}&end_date=${endDate}`;
      
      const res = await new Promise((resolve, reject) => {
        wx.downloadFile({
          url: url,
          header: { 'Authorization': `Bearer ${token}` },
          success: resolve,
          fail: reject
        });
      });

      wx.hideLoading();

      if (res.statusCode !== 200) {
        wx.showToast({ title: '导出失败', icon: 'none' });
        return;
      }

      const fileName = `Miiix_${exportType}_${startDate}_${endDate}.xlsx`;
      const fs = wx.getFileSystemManager();
      const savedPath = `${wx.env.USER_DATA_PATH}/${fileName}`;
      fs.saveFileSync(res.tempFilePath, savedPath);

      wx.showActionSheet({
        itemList: ['打开文件', '保存到手机'],
        success: (r) => {
          if (r.tapIndex === 0) {
            wx.openDocument({
              filePath: savedPath,
              fileType: 'xlsx',
              success: () => console.log('打开成功'),
              fail: () => {
                wx.showToast({ title: '打开失败', icon: 'none' });
              }
            });
          } else {
            wx.saveFile({
              tempFilePath: savedPath,
              success: () => {
                wx.showToast({ title: '已保存' });
              }
            });
          }
        }
      });
    } catch (err) {
      wx.hideLoading();
      wx.showToast({ title: '导出失败', icon: 'none' });
    }
  }
});