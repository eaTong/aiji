import api from './auth'

export const knowledgeApi = {
  getArticles: (params: { page?: number; pageSize?: number; keyword?: string; type?: string; status?: string }) =>
    api.get('/knowledge/articles', { params }),
  getArticle: (id: string) => api.get(`/knowledge/articles/${id}`),
  createArticle: (data: any) => api.post('/knowledge/articles', data),
  updateArticle: (id: string, data: any) => api.put(`/knowledge/articles/${id}`, data),
  publishArticle: (id: string) => api.post(`/knowledge/articles/${id}/publish`),
  deleteArticle: (id: string) => api.delete(`/knowledge/articles/${id}`),
  getCategories: (type?: string) => api.get('/knowledge/categories', { params: { type } }),
  createCategory: (data: any) => api.post('/knowledge/categories', data),
  updateCategory: (id: string, data: any) => api.put(`/knowledge/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/knowledge/categories/${id}`),
  getContributions: (params: { page?: number; pageSize?: number; status?: string }) =>
    api.get('/knowledge/contributions', { params }),
  reviewContribution: (id: string, data: { approved: boolean; note?: string }) =>
    api.post(`/knowledge/contributions/${id}/review`, data),
  getStats: () => api.get('/knowledge/stats')
}
