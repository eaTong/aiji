import { request } from './request'
import { User } from '../types'

export function getProfile(): Promise<User> {
  return request<User>('GET', '/api/user/profile')
}

export function updateProfile(data: Partial<User>): Promise<User> {
  return request<User>('PUT', '/api/user/profile', data as Record<string, unknown>)
}