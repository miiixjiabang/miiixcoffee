const api = require('../../utils/api');

Component({
  properties: {
    type: { type: String, value: 'daily' },
    title: { type: String, value: '盘点' },
    dateLabel: { type: String, value: '盘点日期' }
  },

  data: {
    date: '',
    searchTerm: '',
    categories: [],
    selectedCategory: '',
    currentMaterials: [],
    quantities: {},
    saving: false
  },

  lifetimes: {
    attached() {
      this.loadMaterials();
    }
  },

  methods: {
    async loadMaterials() {
      try {
        const type = this.properties.type === 'monthly' ? '' : this.properties.type;
        const res = await api.getMaterials(type);
        const materials = res.materials || [];
        
        // 按分类分组
        const categoryMap = {};
        materials.forEach(m => {
          if (!categoryMap[m.category]) {
            categoryMap[m.category] = [];
          }
          categoryMap[m.category].push(m);
        });

        const categories = Object.keys(categoryMap).map(name => ({
          name,
          count: categoryMap[name].length,
          materials: categoryMap[name]
        }));

        this.setData({
          categories,
          selectedCategory: categories[0]?.name || '',
          currentMaterials: categories[0]?.materials || []
        });
      } catch (err) {
        wx.showToast({ title: '加载物料失败', icon: 'none' });
      }
    },

    onDateChange(e) {
      this.setData({ date: e.detail.value });
    },

    onSearchInput(e) {
      const term = e.detail.value.toLowerCase();
      this.setData({ searchTerm: term });
      this.filterMaterials();
    },

    onCategoryTap(e) {
      const name = e.currentTarget.dataset.name;
      this.setData({ selectedCategory: name });
      this.filterMaterials();
    },

    filterMaterials() {
      const { categories, selectedCategory, searchTerm } = this.data;
      const category = categories.find(c => c.name === selectedCategory);
      if (!category) return;

      let materials = category.materials;
      if (searchTerm) {
        materials = materials.filter(m => m.name.toLowerCase().includes(searchTerm));
      }
      this.setData({ currentMaterials: materials });
    },

    onQuantityInput(e) {
      const id = e.currentTarget.dataset.id;
      const value = e.detail.value;
      const quantities = { ...this.data.quantities, [id]: value };
      this.setData({ quantities });
    },

    async handleSave() {
      const { type, date, quantities, categories } = this.data;
      if (!date) {
        wx.showToast({ title: '请选择日期', icon: 'none' });
        return;
      }

      const items = Object.entries(quantities)
        .filter(([_, v]) => v && parseFloat(v) > 0)
        .map(([materialId, quantity]) => ({
          material_id: parseInt(materialId),
          quantity: parseFloat(quantity)
        }));

      if (items.length === 0) {
        wx.showToast({ title: '请至少录入一项物料', icon: 'none' });
        return;
      }

      this.setData({ saving: true });
      try {
        const res = await api.saveInventory({
          record_type: type,
          record_date: date,
          items
        });
        wx.showToast({ title: '保存成功', icon: 'success' });
        this.triggerEvent('saved', res);
      } catch (err) {
        wx.showToast({ title: err || '保存失败', icon: 'none' });
      } finally {
        this.setData({ saving: false });
      }
    }
  }
});