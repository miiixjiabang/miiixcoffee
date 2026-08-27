const api = require('../../utils/api');

Page({
  data: {
    materials: [],
    selectedMaterial: null,
    purchaseDate: '',
    quantity: '',
    unitPrice: '',
    totalAmount: 0,
    purchases: [],
    saving: false
  },

  onShow() {
    this.loadMaterials();
    this.loadPurchases();
  },

  async loadMaterials() {
    try {
      const res = await api.getMaterials();
      this.setData({ materials: res.materials || [] });
    } catch (err) {
      console.error('加载物料失败:', err);
    }
  },

  async loadPurchases() {
    try {
      const res = await api.getPurchases();
      this.setData({ purchases: res.purchases || [] });
    } catch (err) {
      console.error('加载进货记录失败:', err);
    }
  },

  onMaterialChange(e) {
    const idx = e.detail.value;
    const material = this.data.materials[idx];
    this.setData({ 
      selectedMaterial: material,
      unitPrice: material.price ? String(material.price) : ''
    });
    this.calcTotal();
  },

  onDateChange(e) {
    this.setData({ purchaseDate: e.detail.value });
  },

  onQuantityInput(e) {
    this.setData({ quantity: e.detail.value });
    this.calcTotal();
  },

  onPriceInput(e) {
    this.setData({ unitPrice: e.detail.value });
    this.calcTotal();
  },

  calcTotal() {
    const qty = parseFloat(this.data.quantity) || 0;
    const price = parseFloat(this.data.unitPrice) || 0;
    this.setData({ totalAmount: qty * price });
  },

  async handleSave() {
    const { selectedMaterial, purchaseDate, quantity, unitPrice } = this.data;
    if (!selectedMaterial) {
      wx.showToast({ title: '请选择物料', icon: 'none' });
      return;
    }
    if (!purchaseDate) {
      wx.showToast({ title: '请选择日期', icon: 'none' });
      return;
    }
    if (!quantity || !unitPrice) {
      wx.showToast({ title: '请输入数量和单价', icon: 'none' });
      return;
    }

    this.setData({ saving: true });
    try {
      await api.savePurchase({
        material_id: selectedMaterial.id,
        purchase_date: purchaseDate,
        quantity: parseFloat(quantity),
        unit_price: parseFloat(unitPrice)
      });
      wx.showToast({ title: '保存成功', icon: 'success' });
      this.setData({ quantity: '', unitPrice: '', totalAmount: 0 });
      this.loadPurchases();
    } catch (err) {
      wx.showToast({ title: err || '保存失败', icon: 'none' });
    } finally {
      this.setData({ saving: false });
    }
  }
});