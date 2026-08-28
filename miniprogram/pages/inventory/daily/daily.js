Page({
  data: {
    activeTab: 'daily'
  },

  onSaved(e) {
    console.log('日盘已保存:', e.detail);
  },

  switchTab(e) {
    const tab = e.currentTarget.dataset.tab;
    if (tab === 'weekly') {
      wx.navigateTo({ url: '/pages/inventory/weekly/weekly' });
    } else if (tab === 'monthly') {
      wx.navigateTo({ url: '/pages/inventory/monthly/monthly' });
    }
  }
});