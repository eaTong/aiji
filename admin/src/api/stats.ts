import api from './auth'

export const statsApi = {
  getOverview: () => api.get('/stats/overview'),
  getUserGrowth: (params: { startDate: string; endDate: string }) => api.get('/stats/users', { params }),
  getTraining: (params?: { startDate?: string; endDate?: string }) => api.get('/stats/training', { params })
}
