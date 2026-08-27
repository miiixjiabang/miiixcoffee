const api = require('../../utils/api');

Page({
  data: {
    user: null,
    alerts: [],
    materials: [],
    selectedMaterial: null,
    threshold: '',
    saving: false
  },

  onShow() {
    const app = getApp();
    this.setData({ user: app.globalData.user });
    this.loadAlerts();
    this.loadMaterials();
  },

  async loadAlerts() {
    try {
      const res = await api.getAlerts();
      this.setData({ alerts: res.alerts || [] });
    } catch (err) {
      console.error('加载预警失败:', err);
    }
  },

  async loadMaterials() {
    try {
      const res = await api.getMaterials();
      this.setData({ materials: res.materials || [] });
    } catch (err) {
      console.error('加载物料失败:', err);
    }
  },

  onMaterialChange(e) {
    const idx = e.detail.value;
    this.setData({ selectedMaterial: this.data.materials[idx] });
  },

  onThresholdInput(e) {
    this.setData({ threshold: e.detail.value });
  },

  async handleSetThreshold() {
    const { selectedMaterial, threshold } = this.data;
    if (!selectedMaterial) {
      wx.showToast({ title: '请选择物料', icon: 'none' });
      return;
    }
    if (!threshold) {
      wx.showToast({ title: '请输入阈值', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    try {
      await api.setAlertThreshold({
        material_id: selectedMaterial.id,
        threshold: parseFloat(threshold)
      });
      wx.showToast({ title: '设置成功', icon: 'success' });
      this.setData({ threshold: '', selectedMaterial: null });
      this.loadAlerts();
    } catch (err) {
      wx.showToast({ title: err || '设置失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});