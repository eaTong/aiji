import api from './auth'

export const usersApi = {
  getUsers: (params: { page?: number; pageSize?: number; keyword?: string }) =>
    api.get('/users', { params }),
  getUserById: (id: string) => api.get(`/users/${id}`),
  updateUser: (id: string, data: any) => api.put(`/users/${id}`, data),
  disableUser: (id: string, disabled: boolean) => api.put(`/users/${id}/disable`, { disabled })
}
