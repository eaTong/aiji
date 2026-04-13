export interface ApiResponse<T = unknown> {
  code: number
  message: string
  data: T
}

export interface User {
  id: string
  openid: string
  nickname?: string
  height?: number
  targetWeight?: number
  goal?: 'LOSE_FAT' | 'GAIN_MUSCLE' | 'BODY_SHAPE' | 'IMPROVE_FITNESS'
  level: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED'
  equipment: 'GYM' | 'DUMBBELL' | 'BODYWEIGHT'
  weeklyTrainingDays: number
  currentPhase: 'CUT' | 'BULK' | 'MAINTAIN'
}

export interface WeightRecord {
  id: string
  weight: number
  recordedAt: string
  sevenDayAvg?: number
  note?: string
}

export interface MeasurementRecord {
  id: string
  waist?: number
  hip?: number
  chest?: number
  leftArm?: number
  rightArm?: number
  leftThigh?: number
  rightThigh?: number
  leftCalf?: number
  rightCalf?: number
  bodyFat?: number
  recordedAt: string
}

export interface ProgressPhoto {
  id: string
  photoUrl: string
  angle: 'FRONT' | 'SIDE' | 'BACK'
  recordedAt: string
}