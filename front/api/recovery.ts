import { request } from './request'

export interface RecoveryStatus {
  date: string
  score: number
  sleepHours: number
  muscleStatus: Record<string, number>
  recommendation: 'TRAIN' | 'REST' | 'LIGHT'
}

export function getRecovery(date: string): Promise<RecoveryStatus> {
  return request<RecoveryStatus>('GET', '/api/recovery', { date })
}

export function postSleep(data: { date: string; sleepHours: number }): Promise<RecoveryStatus> {
  return request<RecoveryStatus>('POST', '/api/recovery/sleep', data)
}