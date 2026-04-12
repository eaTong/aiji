import { request } from './request'
import { User } from '../types'

export interface LoginResponse {
  token: string
  user: User
}

export function wxLogin(code: string): Promise<LoginResponse> {
  return request<LoginResponse>('POST', '/api/auth/wx-login', { code })
}