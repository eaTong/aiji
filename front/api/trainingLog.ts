import { request } from './request'

export interface TrainingLog {
  id: string
  status: 'IN_PROGRESS' | 'COMPLETED' | 'ABANDONED'
  startedAt: string
  completedAt?: string
  totalVolume?: number
  duration?: number
}

export interface TrainingLogEntry {
  id: string
  logId: string
  exerciseId: string
  exerciseName: string
  setNumber: number
  weight: number
  reps: number
  isWarmup: boolean
  e1rm?: number
  muscleVolumes: Record<string, number>  // { "chest": 480, "triceps": 240 }
  completedAt: string
  createdAt: string
}

export interface StartTrainingLogResponse {
  id: string
  status: 'IN_PROGRESS'
  startedAt: string
}

export interface FinishTrainingLogResponse {
  id: string
  totalVolume: number
  duration: number
  status: 'COMPLETED'
}

export function startTrainingLog(): Promise<StartTrainingLogResponse> {
  return request<StartTrainingLogResponse>('POST', '/api/training-logs')
}

export function addTrainingLogEntry(data: {
  logId: string
  exerciseId: string
  exerciseName: string
  setNumber: number
  weight: number
  reps: number
  isWarmup: boolean
}): Promise<TrainingLogEntry> {
  return request<TrainingLogEntry>('POST', '/api/training-logs/entries', data)
}

export function finishTrainingLog(logId: string): Promise<FinishTrainingLogResponse> {
  return request<FinishTrainingLogResponse>('POST', '/api/training-logs/finish', { logId })
}

export function getTrainingLogs(): Promise<TrainingLog[]> {
  return request<TrainingLog[]>('GET', '/api/training-logs')
}

export function getTrainingLog(logId: string): Promise<TrainingLog & { logEntries: TrainingLogEntry[] }> {
  return request<TrainingLog & { logEntries: TrainingLogEntry[] }>('GET', `/api/training-logs/${logId}`)
}

export function getExerciseHistory(exerciseId: string): Promise<Array<{
  weight: number
  reps: number
  e1rm?: number
  recordedAt: string
}>> {
  return request<Array<{
    weight: number
    reps: number
    e1rm?: number
    recordedAt: string
  }>>('GET', `/api/training-logs/exercise/${exerciseId}/history`)
}