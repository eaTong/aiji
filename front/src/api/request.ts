import { ApiResponse } from '../types'

const BASE_URL = 'http://localhost:3000'

function getToken(): string {
  try {
    return uni.getStorageSync('token') ?? ''
  } catch {
    return ''
  }
}

export function request<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  url: string,
  data?: Record<string, unknown>
): Promise<T> {
  return new Promise((resolve, reject) => {
    uni.request({
      url: BASE_URL + url,
      method,
      data,
      header: { Authorization: `Bearer ${getToken()}` },
      success(res) {
        const body = res.data as ApiResponse<T>
        if (body.code === 0) {
          resolve(body.data)
        } else if (body.code === 401) {
          uni.navigateTo({ url: '/pages/profile/login' })
          reject(new Error('未授权'))
        } else {
          uni.showToast({ title: body.message, icon: 'none' })
          reject(new Error(body.message))
        }
      },
      fail(err) {
        uni.showToast({ title: '网络错误', icon: 'none' })
        reject(err)
      },
    })
  })
}