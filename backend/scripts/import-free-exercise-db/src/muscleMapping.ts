/**
 * free-exercise-db 肌肉名称 → 本项目 Muscle.code 映射表
 *
 * 设计原则：
 * 1. free-exercise-db 有 17 种基础肌肉
 * 2. 本项目 Muscle 有 34 个细分部位
 * 3. 一个 free-exercise-db 肌肉可映射到多个 Muscle.code（如 chest → 上/中/下胸）
 * 4. ratio 表示该细分部位在此肌肉中的权重比例
 */

// MuscleRole 枚举
type MuscleRole = 'PRIMARY' | 'SECONDARY'

export interface MuscleMappingItem {
  code: string
  ratio: number
}

export type MuscleMapping = MuscleMappingItem[]

/**
 * free-exercise-db 肌肉名称 → Muscle.code 映射
 *
 * free-exercise-db 肌肉名称（17种）：
 * abdominals, abductors, adductors, biceps, calves, chest,
 * forearms, glutes, hamstrings, lats, lower back, middle back,
 * neck, quadriceps, shoulders, traps, triceps
 */
export const FREE_EXERCISE_DB_MUSCLE_MAPPING: Record<string, MuscleMapping> = {
  // 胸部 → 拆分为上/中/下胸
  chest: [
    { code: 'CHEST_UPPER', ratio: 0.4 },
    { code: 'CHEST_MIDDLE', ratio: 0.3 },
    { code: 'CHEST_LOWER', ratio: 0.3 },
  ],

  // 背部
  lats: [
    { code: 'LATS', ratio: 1.0 },
  ],
  traps: [
    { code: 'TRAPS', ratio: 1.0 },
  ],
  'lower back': [
    { code: 'LOWER_BACK', ratio: 1.0 },
  ],
  'middle back': [
    { code: 'RHOMBOID', ratio: 1.0 },
  ],

  // 腿部
  quadriceps: [
    { code: 'QUADS', ratio: 1.0 },
  ],
  hamstrings: [
    { code: 'HAMSTRINGS', ratio: 1.0 },
  ],
  glutes: [
    { code: 'GLUTES', ratio: 1.0 },
  ],
  calves: [
    { code: 'CALVES', ratio: 1.0 },
  ],
  abductors: [
    { code: 'ABDUCTORS', ratio: 1.0 },
  ],
  adductors: [
    { code: 'ADDUCTORS', ratio: 1.0 },
  ],

  // 肩部 → 拆分为前/中/后束
  shoulders: [
    { code: 'DELTS_FRONT', ratio: 0.4 },
    { code: 'DELTS_MIDDLE', ratio: 0.3 },
    { code: 'DELTS_REAR', ratio: 0.3 },
  ],

  // 手臂
  biceps: [
    { code: 'BICEPS', ratio: 1.0 },
  ],
  triceps: [
    { code: 'TRICEPS', ratio: 1.0 },
  ],
  forearms: [
    { code: 'FOREARMS', ratio: 1.0 },
  ],

  // 核心 → 拆分为上下腹
  abdominals: [
    { code: 'ABS_UPPER', ratio: 0.5 },
    { code: 'ABS_LOWER', ratio: 0.5 },
  ],

  // 未知/未覆盖 → 记录待处理
  // neck: 颈部（暂不处理）
}

/**
 * 根据 free-exercise-db 肌肉名称获取映射
 */
export function getMuscleMapping(
  muscleName: string,
  role: MuscleRole
): MuscleMapping | null {
  const lower = muscleName.toLowerCase()
  const mapping = FREE_EXERCISE_DB_MUSCLE_MAPPING[lower]

  if (!mapping) {
    console.warn(`[映射警告] 未找到肌肉映射: ${muscleName}`)
    return null
  }

  // 辅肌群的 ratio 减半
  if (role === 'SECONDARY') {
    return mapping.map(item => ({
      code: item.code,
      ratio: item.ratio * 0.5,
    }))
  }

  return mapping
}

/**
 * 获取所有已映射的 free-exercise-db 肌肉名称
 */
export function getMappedMuscleNames(): string[] {
  return Object.keys(FREE_EXERCISE_DB_MUSCLE_MAPPING)
}

/**
 * 获取所有未映射的 free-exercise-db 肌肉名称
 */
export function getUnmappedMuscleNames(allFreeExerciseMuscles: string[]): string[] {
  const mapped = new Set(Object.keys(FREE_EXERCISE_DB_MUSCLE_MAPPING))
  return allFreeExerciseMuscles.filter(m => !mapped.has(m.toLowerCase()))
}
