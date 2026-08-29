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
      // 验证 token 是否有效
      this.checkSession(token);
    }
  },

  // 验证 token 是否有效
  checkSession(token) {
    wx.request({
      url: this.globalData.baseUrl + '/api/auth/check',
      method: 'GET',
      header: { 'Authorization': 'Bearer ' + token },
      fail: () => {
        // 网络错误，不清除登录状态，下次再试
      },
      complete: (res) => {
        if (res.statusCode !== 200 || !res.data?.valid) {
          // token 无效，清除登录状态
          this.logout();
        }
      }
    });
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