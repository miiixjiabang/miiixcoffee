App({
  globalData: {
    token: '',
    user: null,
    // TODO: 替换为你的实际 API 地址
    baseUrl: 'https://a53c726e-4fb6-4e37-8d9b-1e25a9699f2c.dev.coze.site'
  },

  onLaunch() {
    // 从本地存储恢复登录状态
    const token = wx.getStorageSync('token');
    const user = wx.getStorageSync('user');
    if (token && user) {
      this.globalData.token = token;
      this.globalData.user = user;
    }
  },

  // 登录
  login(token, user) {
    this.globalData.token = token;
    this.globalData.user = user;
    wx.setStorageSync('token', token);
    wx.setStorageSync('user', user);
  },

  // 登出
  logout() {
    this.globalData.token = '';
    this.globalData.user = null;
    wx.removeStorageSync('token');
    wx.removeStorageSync('user');
  },

  // 获取请求头
  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + this.globalData.token
    };
  }
});