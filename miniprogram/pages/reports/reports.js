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

  // 导出 CSV
  exportCSV() {
    const { summary, trend, startDate, endDate } = this.data;

    let csv = '\uFEFF'; // BOM for Excel
    csv += '日期,消耗金额,物料数\n';
    summary.forEach(item => {
      const amount = item.total_consumption || item.total_amount || 0;
      csv += `${item.date},¥${amount},${item.items || 0}\n`;
    });

    csv += '\n物料名称,分类';
    const dates = new Set();
    trend.forEach(t => {
      Object.keys(t.data).forEach(d => dates.add(d));
    });
    const sortedDates = Array.from(dates).sort();
    sortedDates.forEach(d => { csv += `,${d}`; });
    csv += '\n';

    trend.forEach(t => {
      csv += `${t.name},${t.category}`;
      sortedDates.forEach(d => {
        csv += `,${t.data[d] || 0}`;
      });
      csv += '\n';
    });

    const fs = wx.getFileSystemManager();
    const fileName = `Miiix报表_${startDate}_${endDate}.csv`;
    const filePath = `${wx.env.USER_DATA_PATH}/${fileName}`;

    wx.showLoading({ title: '生成中' });
    try {
      fs.writeFileSync(filePath, csv, 'utf8');
      wx.hideLoading();
      wx.showActionSheet({
        itemList: ['打开文件', '保存到手机'],
        success: (res) => {
          if (res.tapIndex === 0) {
            wx.openDocument({
              filePath: filePath,
              fileType: 'csv',
              success: () => console.log('打开成功'),
              fail: (err) => {
                wx.showToast({ title: '打开失败', icon: 'none' });
              }
            });
          } else {
            wx.saveFile({
              tempFilePath: filePath,
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