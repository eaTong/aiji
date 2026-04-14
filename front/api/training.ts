import { request } from './request'

// ============ 训练推荐接口 ============

export interface RecommendResponse {
  type: 'new_recommendation' | 'existing_plan' | 'rest_day' | 'completed_today' | 'need_goal' | 'overtraining_warning'
  message?: string
  options?: string[]
  suggestions?: string[]
  warnings?: string[]  // 过度训练预警信息
  muscleScores?: Record<string, number>  // 肌群恢复分数（用于热力图）
  overallScore?: number  // 整体恢复分数
  training?: {
    name: string
    duration: number
    type: string
    targetMuscle: string
    exercises: {
      name: string
      sets: number
      reps: string
      lastWeight?: number
    }[]
    reason: string
  }
  completedTraining?: {
    name: string
    duration: number
  }
}

export function recommendTraining(forceRefresh = false, quickMode = false): Promise<RecommendResponse> {
  return request<RecommendResponse>('POST', '/api/training/recommend', { forceRefresh, quickMode })
}

// ============ 训练记录保存接口 ============

export interface ExerciseSet {
  exerciseId: string
  exerciseName: string
  sets: number
  reps: number
  weight: number
  weightUnit?: 'kg' | 'lb'
  isWarmup?: boolean
}

export interface SaveRecordResponse {
  id: string
  totalVolume: number
  e1rm: Record<string, number>
  message: string
}

export function saveTrainingRecord(data: {
  date: string
  trainingType: string
  exercises: ExerciseSet[]
  notes?: string
}): Promise<SaveRecordResponse> {
  return request<SaveRecordResponse>('POST', '/api/training/record', data)
}