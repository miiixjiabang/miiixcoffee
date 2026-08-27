const app = getApp();

/**
 * 封装 wx.request
 */
function request(options) {
  return new Promise((resolve, reject) => {
    wx.request({
      url: app.globalData.baseUrl + options.url,
      method: options.method || 'GET',
      data: options.data || {},
      header: app.getHeaders(),
      success(res) {
        if (res.statusCode === 401) {
          // 未登录，跳转登录页
          app.logout();
          wx.redirectTo({ url: '/pages/login/login' });
          reject('未登录');
        } else if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
        } else {
          reject(res.data.error || '请求失败');
        }
      },
      fail(err) {
        reject('网络错误');
      }
    });
  });
}

// 物料
function getMaterials(type) {
  return request({ url: '/api/materials' + (type ? '?type=' + type : '') });
}

// 盘点
function getInventory(params) {
  const qs = Object.keys(params).map(k => k + '=' + params[k]).join('&');
  return request({ url: '/api/inventory?' + qs });
}

function saveInventory(data) {
  return request({ url: '/api/inventory', method: 'POST', data });
}

function getWeeklySummary(weekStart) {
  return request({ url: '/api/inventory/weekly?week_start=' + weekStart });
}

function saveWeekly(data) {
  return request({ url: '/api/inventory/weekly', method: 'POST', data });
}

function approveInventory(recordId) {
  return request({ url: '/api/inventory/approve', method: 'PUT', data: { record_id: recordId } });
}

// 进货
function getPurchases() {
  return request({ url: '/api/purchases' });
}

function savePurchase(data) {
  return request({ url: '/api/purchases', method: 'POST', data });
}

// 预警
function getAlerts() {
  return request({ url: '/api/alerts' });
}

function setAlertThreshold(data) {
  return request({ url: '/api/alerts', method: 'POST', data });
}

// 报表
function getReports(params) {
  const qs = Object.keys(params).map(k => k + '=' + params[k]).join('&');
  return request({ url: '/api/reports?' + qs });
}

module.exports = {
  request,
  getMaterials,
  getInventory,
  saveInventory,
  getWeeklySummary,
  saveWeekly,
  approveInventory,
  getPurchases,
  savePurchase,
  getAlerts,
  setAlertThreshold,
  getReports
};