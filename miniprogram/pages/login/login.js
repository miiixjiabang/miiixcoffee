const { login } = require('../../utils/auth');

Page({
  data: {
    username: '',
    password: '',
    error: '',
    loading: false
  },

  onUsernameInput(e) {
    this.setData({ username: e.detail.value, error: '' });
  },

  onPasswordInput(e) {
    this.setData({ password: e.detail.value, error: '' });
  },

  async handleLogin() {
    const { username, password } = this.data;
    if (!username || !password) {
      this.setData({ error: '请输入账号和密码' });
      return;
    }

    this.setData({ loading: true, error: '' });
    try {
      await login(username, password);
      wx.switchTab({ url: '/pages/dashboard/dashboard' });
    } catch (err) {
      this.setData({ error: err });
    } finally {
      this.setData({ loading: false });
    }
  }
});