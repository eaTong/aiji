import { Context } from 'koa'

export interface AuthContext extends Context {
  state: {
    user: { userId: string }
  }
}

export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export function success<T>(data: T, message = 'ok'): ApiResponse<T> {
  return { code: 0, message, data }
}

export function fail(message: string, code = 1): ApiResponse<null> {
  return { code, message, data: null }
}

// Re-export chat types
export * from './chat'
export * from './clarification'