// ExerciseCategory 枚举
type ExerciseCategory = 'CHEST' | 'BACK' | 'LEGS' | 'SHOULDERS' | 'ARMS' | 'CORE' | 'CARDIO'

// Equipment 枚举
type Equipment = 'GYM' | 'DUMBBELL' | 'BODYWEIGHT'

/**
 * 肌肉名称中英文映射表
 */
export const MUSCLE_MAPPING: Record<string, string> = {
  // 英 -> 中
  abdominals: '腹肌',
  abductors: '外展肌群',
  adductors: '内收肌群',
  biceps: '肱二头肌',
  calves: '小腿肌',
  chest: '胸大肌',
  forearms: '前臂',
  glutes: '臀肌',
  hamstrings: '腘绳肌',
  lats: '背阔肌',
  'lower back': '下背',
  'middle back': '中背',
  neck: '颈部',
  quadriceps: '股四头肌',
  shoulders: '三角肌',
  traps: '斜方肌',
  triceps: '肱三头肌',
}

/**
 * 分类映射：free-exercise-db category -> AI己 ExerciseCategory
 * free-exercise-db 使用 muscles 作为分类依据
 */
export const CATEGORY_MAPPING: Record<string, ExerciseCategory> = {
  // 胸部相关
  chest: 'CHEST',
  pecs: 'CHEST',

  // 背部相关
  back: 'BACK',
  lats: 'BACK',
  'upper back': 'BACK',
  'lower back': 'BACK',
  traps: 'BACK',

  // 腿部相关
  legs: 'LEGS',
  quadriceps: 'LEGS',
  hamstrings: 'LEGS',
  calves: 'LEGS',
  glutes: 'LEGS',
  abductors: 'LEGS',
  adductors: 'LEGS',

  // 肩部相关
  shoulders: 'SHOULDERS',
  delts: 'SHOULDERS',
  rotator: 'SHOULDERS',

  // 手臂相关
  arms: 'ARMS',
  biceps: 'ARMS',
  triceps: 'ARMS',
  forearms: 'ARMS',

  // 核心相关
  core: 'CORE',
  abs: 'CORE',
  abdominals: 'CORE',
  obliques: 'CORE',

  // 有氧
  cardio: 'CARDIO',
  cardiovascular: 'CARDIO',
}

/**
 * 器械映射：free-exercise-db equipment -> AI己 Equipment
 */
export const EQUIPMENT_MAPPING: Record<string, Equipment> = {
  // 健身房器械 -> GYM
  barbell: 'GYM',
  dumbbell: 'GYM',
  machine: 'GYM',
  cable: 'GYM',
  'e-z curl bar': 'GYM',
  kettlebells: 'GYM',
  'kettlebell': 'GYM',
  'medicine ball': 'GYM',
  bands: 'GYM',
  'resistance bands': 'GYM',
  'foam roll': 'GYM',
  other: 'GYM',
  'weighted': 'GYM',
  'leverage machine': 'GYM',

  // 自重 -> BODYWEIGHT
  'body only': 'BODYWEIGHT',
  'bodyweight': 'BODYWEIGHT',
}

/**
 * 根据主肌群推断分类
 * 如果 free-exercise-db 的 category 不明确，使用主肌群推断
 */
export function inferCategory(primaryMuscles: string[]): ExerciseCategory {
  for (const muscle of primaryMuscles) {
    const lower = muscle.toLowerCase()
    if (MUSCLE_MAPPING[lower]) {
      const mapped = MUSCLE_MAPPING[lower]
      // 胸大肌/上胸/胸 -> CHEST
      if (mapped.includes('胸')) return 'CHEST'
      // 背阔肌/斜方肌/中背/下背 -> BACK
      if (mapped.includes('背')) return 'BACK'
      // 股四头肌/腘绳肌/臀肌/小腿 -> LEGS
      if (mapped.includes('腿') || mapped.includes('臀') || mapped.includes('腘')) return 'LEGS'
      // 三角肌 -> SHOULDERS
      if (mapped.includes('三角肌')) return 'SHOULDERS'
      // 肱二头肌/肱三头肌/前臂 -> ARMS
      if (mapped.includes('肱') || mapped.includes('前臂')) return 'ARMS'
      // 腹肌 -> CORE
      if (mapped.includes('腹肌') || mapped.includes('腹')) return 'CORE'
    }
  }
  // 默认返回 CORE
  return 'CORE'
}

/**
 * 转换肌肉名称到中文
 */
export function translateMuscle(muscle: string): string {
  const lower = muscle.toLowerCase()
  return MUSCLE_MAPPING[lower] || muscle
}

/**
 * 批量转换肌肉名称数组
 */
export function translateMuscles(muscles: string[]): string[] {
  return muscles.map(translateMuscle)
}
