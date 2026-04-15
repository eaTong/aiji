import { request } from './request'

export interface Exercise {
  id: string
  name: string
  nameEn?: string
  category: 'CHEST' | 'BACK' | 'LEGS' | 'SHOULDERS' | 'ARMS' | 'CORE' | 'CARDIO'
  equipment: 'GYM' | 'DUMBBELL' | 'BODYWEIGHT'
  primaryMuscles: string[]  // muscle codes
  secondaryMuscles: string[]  // muscle codes
  instructions?: string  // 英文说明
  instructionsZh?: string  // 中文说明（优先显示）
  commonMistakes?: string
  warnings?: string  // 注意事项
  imageUrls?: string  // 图片URL列表，逗号分隔
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

export function getFavoriteExercises(): Promise<Exercise[]> {
  return request<Exercise[]>('GET', '/api/exercises?favorites=true')
}