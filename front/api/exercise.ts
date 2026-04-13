import { request } from './request'

export interface Exercise {
  id: string
  name: string
  nameEn?: string
  category: 'CHEST' | 'BACK' | 'LEGS' | 'SHOULDERS' | 'ARMS' | 'CORE' | 'CARDIO'
  equipment: 'BARBELL' | 'DUMBBELL' | 'CABLE' | 'MACHINE' | 'BODYWEIGHT'
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions?: string
  commonMistakes?: string
  isFavorite: boolean
}

export function getExercises(params?: {
  category?: string
  keyword?: string
}): Promise<Exercise[]> {
  const queryParts: string[] = []
  if (params?.category) queryParts.push(`category=${params.category}`)
  if (params?.keyword) queryParts.push(`keyword=${encodeURIComponent(params.keyword)}`)
  const query = queryParts.length > 0 ? '?' + queryParts.join('&') : ''
  return request<Exercise[]>('GET', `/api/exercises${query}`)
}

export function getExerciseById(id: string): Promise<Exercise> {
  return request<Exercise>('GET', `/api/exercises/${id}`)
}

export function toggleFavorite(id: string): Promise<Exercise> {
  return request<Exercise>('POST', `/api/exercises/${id}/favorite`)
}