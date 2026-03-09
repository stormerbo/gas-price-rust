import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
});

export const gasPriceAPI = {
  // 查询历史记录
  getHistory: (params) => api.get('/history', { params }),
  
  // 创建记录
  create: (data) => api.post('', data),
  
  // 更新记录
  update: (id, data) => api.put(`/${id}`, data),
  
  // 删除记录
  delete: (id) => api.delete(`/${id}`),
  
  // 爬取数据
  crawl: (data) => api.post('/crawl', data),
};

export default api;
