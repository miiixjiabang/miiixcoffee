const app = getApp();

/**
 * 登录
 */
function login(username, password) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: app.globalData.baseUrl + '/api/auth/login',
      method: 'POST',
      data: { username, password },
      success(res) {
        if (res.statusCode === 200 && res.data.success) {
          app.login(res.data.token, res.data.user);
          resolve(res.data);
        } else {
          reject(res.data.error || '登录失败');
        }
      },
      fail(err) {
        reject('网络错误');
      }
    });
  });
}

/**
 * 登出
 */
function logout() {
  return new Promise((resolve) => {
    wx.request({
      url: app.globalData.baseUrl + '/api/auth/logout',
      method: 'POST',
      header: app.getHeaders(),
      success() {
        app.logout();
        resolve();
      },
      fail() {
        app.logout();
        resolve();
      }
    });
  });
}

/**
 * 检查登录状态
 */
function checkLogin() {
  return app.globalData.token && app.globalData.user;
}

module.exports = { login, logout, checkLogin };