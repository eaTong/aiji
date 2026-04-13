import { ExerciseCategory, Equipment } from '../../src/models/exerciseService'

/**
 * free-exercise-db 原始数据结构
 */
export interface FreeExerciseDbItem {
  id: string
  name: string
  force?: string
  level?: string
  mechanic?: string
  equipment: string
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string[]
  category: string
  images: string[]
}

/**
 * 处理后的动作数据（转换完成，尚未AI增强）
 */
export interface ProcessedExercise {
  sourceId: string           // 原始ID
  name: string               // 中文名称
  nameEn: string             // 英文名称
  category: ExerciseCategory
  equipment: Equipment
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string       // 英文说明（待翻译）
  level?: string             // 难度等级
  images: string[]           // 图片相对路径
}

/**
 * AI增强后的动作数据
 */
export interface EnrichedExercise extends ProcessedExercise {
  instructionsZh: string     // AI翻译后的中文说明
  warnings: string[]         // 注意事项
  mistakes: string[]         // 易错点
  ossImages: string[]        // OSS图片URL
}

/**
 * 最终导入数据格式
 */
export interface FinalExercise {
  name: string
  nameEn: string | null
  category: ExerciseCategory
  equipment: Equipment
  primaryMuscles: string[]
  secondaryMuscles: string[]
  instructions: string | null
  commonMistakes: string | null
  videoUrl: string | null    // OSS图片URL，逗号分隔
  isCustom: boolean
  isFavorite: boolean
  userId: string | null
}

/**
 * 搜索结果
 */
export interface WebSearchResult {
  title: string
  url: string
  snippet: string
}

/**
 * 导入结果报告
 */
export interface ImportReport {
  generatedAt: string
  totalCount: number
  successCount: number
  failedCount: number
  errors: string[]
}
