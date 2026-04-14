import { getExercises } from './exerciseService'

// ============================================
// 训练记录解析器 - 自然语言解析为结构化数据
// ============================================

export interface ParsedSet {
  weight: number
  reps: number
  isWarmup?: boolean
}

export interface ParsedExercise {
  name: string
  sets: ParsedSet[]
}

export interface ParsedTrainingData {
  exercises: ParsedExercise[]
  date?: string
  rawText: string
}

// 动作名称别名映射（用户输入 → 数据库动作名）
const EXERCISE_ALIASES: Record<string, string[]> = {
  '卧推': ['杠铃卧推', '哑铃卧推'],
  '深蹲': ['杠铃深蹲', '哑铃深蹲'],
  '硬拉': ['杠铃硬拉'],
  '引体': ['引体向上', '宽握引体向上'],
  '划船': ['杠铃划船', '哑铃划船'],
  '肩推': ['哑铃肩推', '杠铃肩推'],
  '二头': ['杠铃弯举', '哑铃弯举'],
  '三头': ['绳索下压', '哑铃臂屈伸'],
  '腹肌': ['卷腹', '平板支撑'],
}

// 重量单位映射
const WEIGHT_UNITS: Record<string, number> = {
  'kg': 1,
  '公斤': 1,
  '千克': 1,
  '斤': 0.5,    // 1斤 = 0.5kg
  '市斤': 0.5,
  'lbs': 0.453592,
  '磅': 0.453592,
}

/**
 * 解析自然语言训练输入
 * @example "今天练了卧推 60kg 8个、深蹲 100kg 5个"
 */
export function parseTrainingInput(message: string): ParsedTrainingData {
  const result: ParsedTrainingData = {
    exercises: [],
    rawText: message
  }

  // 提取日期
  if (/今天/i.test(message)) {
    result.date = 'today'
  } else if (/昨天/i.test(message)) {
    result.date = 'yesterday'
  } else if (/前天/i.test(message)) {
    result.date = 'dayBeforeYesterday'
  }

  // 按动作分割（逗号、顿号、分号）
  const exerciseSegments = message.split(/[,，、；;]/)

  for (const segment of exerciseSegments) {
    const parsed = parseExerciseSegment(segment.trim())
    if (parsed) {
      result.exercises.push(parsed)
    }
  }

  return result
}

/**
 * 解析单个动作段
 * @example "卧推 60kg 8个" 或 "卧推 60kg 8个 3组"
 */
function parseExerciseSegment(segment: string): ParsedExercise | null {
  if (!segment || segment.length < 2) return null

  // 跳过非动作文本
  const skipPatterns = [/今天/i, /昨天/i, /练了/i, /训练/i, /做了/i, /记录/i]
  if (skipPatterns.some(p => p.test(segment))) {
    // 尝试提取动作名
  }

  // 提取动作名
  let exerciseName = ''
  for (const [alias, targets] of Object.entries(EXERCISE_ALIASES)) {
    if (segment.includes(alias)) {
      exerciseName = targets[0] // 使用第一个匹配的目标名称
      break
    }
  }

  // 如果没有别名匹配，尝试直接匹配常见动作
  if (!exerciseName) {
    const commonExercises = [
      '杠铃卧推', '哑铃卧推', '杠铃深蹲', '哑铃深蹲', '杠铃硬拉',
      '引体向上', '哑铃划船', '杠铃划船', '哑铃肩推', '平板支撑',
      '卷腹', '绳索下压', '哑铃弯举', '杠铃弯举'
    ]
    for (const ex of commonExercises) {
      if (segment.includes(ex)) {
        exerciseName = ex
        break
      }
    }
  }

  // 提取重量和次数
  const sets: ParsedSet[] = []

  // 匹配模式：重量 + 次数
  // 例如：60kg 8个, 100kg 5次, 80lbs 10reps
  const setPattern = /(\d+\.?\d*)\s*(kg|公斤|斤|lbs|磅)?\s*[,，]?\s*(\d+)\s*(个|次|rep|reps)?/gi

  let match
  while ((match = setPattern.exec(segment)) !== null) {
    const weight = parseFloat(match[1])
    const unit = (match[2] || 'kg').toLowerCase()
    const reps = parseInt(match[3])

    if (!isNaN(weight) && !isNaN(reps) && weight > 0 && reps > 0) {
      // 转换为 kg
      const weightInKg = weight * (WEIGHT_UNITS[unit] || 1)
      sets.push({
        weight: Math.round(weightInKg * 10) / 10, // 保留1位小数
        reps
      })
    }
  }

  // 如果没有匹配到标准格式，尝试模糊匹配
  if (sets.length === 0 && exerciseName) {
    // 尝试提取任何数字组合
    const numbers = segment.match(/\d+\.?\d*/g)
    if (numbers && numbers.length >= 2) {
      sets.push({
        weight: parseFloat(numbers[0]),
        reps: parseInt(numbers[1])
      })
    }
  }

  if (!exerciseName || sets.length === 0) {
    return null
  }

  return { name: exerciseName, sets }
}

/**
 * 验证解析的数据是否合理
 */
export function validateParsedData(data: ParsedTrainingData): {
  valid: boolean
  errors: string[]
} {
  const errors: string[] = []

  if (data.exercises.length === 0) {
    errors.push('未识别到有效的训练动作')
  }

  for (const ex of data.exercises) {
    if (!ex.name) {
      errors.push(`动作名称无效`)
    }
    for (const set of ex.sets) {
      if (set.weight < 1 || set.weight > 500) {
        errors.push(`动作 "${ex.name}" 的重量 ${set.weight}kg 超出合理范围 (1-500kg)`)
      }
      if (set.reps < 1 || set.reps > 100) {
        errors.push(`动作 "${ex.name}" 的次数 ${set.reps} 超出合理范围 (1-100)`)
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors
  }
}

/**
 * 匹配动作名到数据库
 */
export async function matchExercisesToDatabase(
  exercises: ParsedExercise[],
  userId: string
): Promise<Array<{
  original: ParsedExercise
  matched?: {
    id: string
    name: string
    primaryMuscles: string[]
  }
  error?: string
}>> {
  const results = []

  for (const ex of exercises) {
    try {
      // 使用动作名搜索
      const dbExercises = await getExercises({
        keyword: ex.name,
        userId
      })

      if (dbExercises.length > 0) {
        results.push({
          original: ex,
          matched: {
            id: dbExercises[0].id,
            name: dbExercises[0].name,
            primaryMuscles: dbExercises[0].primaryMuscles || []
          }
        })
      } else {
        // 尝试模糊匹配
        const allExercises = await getExercises({ userId })
        const fuzzyMatch = findFuzzyMatch(ex.name, allExercises)

        if (fuzzyMatch) {
          results.push({
            original: ex,
            matched: {
              id: fuzzyMatch.id,
              name: fuzzyMatch.name,
              primaryMuscles: fuzzyMatch.primaryMuscles || []
            }
          })
        } else {
          results.push({
            original: ex,
            error: `未找到匹配的动作: ${ex.name}`
          })
        }
      }
    } catch (error) {
      results.push({
        original: ex,
        error: `匹配失败: ${error}`
      })
    }
  }

  return results
}

/**
 * 模糊匹配动作名
 */
function findFuzzyMatch(
  inputName: string,
  exercises: Array<{ id: string; name: string; nameEn?: string; primaryMuscles?: string[] }>
): { id: string; name: string; primaryMuscles?: string[] } | null {
  const normalized = inputName.toLowerCase()

  for (const ex of exercises) {
    if (ex.name.toLowerCase().includes(normalized)) {
      return ex
    }
    if (ex.nameEn && ex.nameEn.toLowerCase().includes(normalized)) {
      return ex
    }
  }

  // 检查别名
  for (const [alias, targets] of Object.entries(EXERCISE_ALIASES)) {
    if (normalized.includes(alias)) {
      const targetName = targets[0]
      for (const ex of exercises) {
        if (ex.name.includes(targetName)) {
          return ex
        }
      }
    }
  }

  return null
}

/**
 * 生成训练摘要文本
 */
export function generateTrainingSummary(
  exercises: Array<{ name: string; sets: ParsedSet[] }>
): string {
  return exercises.map(ex => {
    const setSummary = ex.sets.map(s => `${s.weight}kg×${s.reps}`).join('、')
    return `${ex.name} ${setSummary}`
  }).join('；')
}
