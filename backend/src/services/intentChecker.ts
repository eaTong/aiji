import {
  IntentType,
  IntentCheckResult,
  ClarifyReason,
  Field,
  INTENT_REQUIREMENTS
} from '../types/clarification'

// ============================================
// 意图检查器 - 判断是否需要追问
// ============================================

/**
 * 检查意图的信息完整性
 */
export function checkIntentCompleteness(
  intent: IntentType,
  extractedEntities: Record<string, any>
): IntentCheckResult {
  const requiredFields = INTENT_REQUIREMENTS[intent] || []

  // 如果没有必需字段，意图完整
  if (requiredFields.length === 0) {
    return {
      shouldClarify: false,
      reason: null,
      missingFields: []
    }
  }

  const missing: Field[] = []

  for (const field of requiredFields) {
    // 检查字段是否存在
    if (extractedEntities[field.name] === undefined || extractedEntities[field.name] === null) {
      // 检查是否有默认值
      if (!hasDefaultValue(field)) {
        missing.push(field)
      }
    } else {
      // 字段存在，检查值是否有效
      const value = extractedEntities[field.name]
      if (!isValidValue(value, field)) {
        missing.push(field)
      }
    }
  }

  if (missing.length > 0) {
    const reason = determineClarifyReason(missing, extractedEntities)
    return {
      shouldClarify: true,
      reason,
      missingFields: missing,
      suggestedQuestion: generateClarifyQuestion(missing)
    }
  }

  return {
    shouldClarify: false,
    reason: null,
    missingFields: []
  }
}

/**
 * 判断追问原因
 */
export function determineClarifyReason(missing: Field[], extracted: Record<string, any>): ClarifyReason {
  for (const field of missing) {
    switch (field.type) {
      case 'number':
        if (extracted[field.name] !== undefined) {
          return 'INVALID_INPUT'
        }
        return 'MISSING_NUMBER'
      case 'select':
        return `MISSING_${field.name.toUpperCase()}` as ClarifyReason
      case 'date':
        return 'MISSING_DATE'
      case 'text':
        if (extracted[field.name]) {
          return 'INVALID_INPUT'
        }
        return field.name === 'exercises' ? 'MISSING_EXERCISE' : 'INCOMPLETE_SENTENCE'
    }
  }

  return 'AMBIGUOUS_INTENT'
}

/**
 * 生成追问问题
 */
function generateClarifyQuestion(missingFields: Field[]): string {
  if (missingFields.length === 0) {
    return ''
  }

  // 优先追问最重要的字段
  const firstField = missingFields[0]

  switch (firstField.type) {
    case 'number':
      return firstField.question
    case 'select':
      if (firstField.options && firstField.options.length > 0) {
        const options = firstField.options.join('、')
        return `${firstField.question}（${options}）`
      }
      return firstField.question
    case 'date':
      return firstField.question
    case 'text':
      return firstField.question
    default:
      return firstField.question
  }
}

/**
 * 检查字段是否有默认值
 */
function hasDefaultValue(field: Field): boolean {
  // 某些字段有默认值，可以跳过追问
  const defaults: Record<string, any> = {
    unit: 'kg',
    date: new Date().toISOString().split('T')[0]
  }

  return defaults[field.name] !== undefined
}

/**
 * 验证值是否有效
 */
function isValidValue(value: any, field: Field): boolean {
  if (value === undefined || value === null || value === '') {
    return false
  }

  if (field.validation) {
    // 数字范围验证
    if (field.type === 'number') {
      const num = Number(value)
      if (isNaN(num)) return false
      if (field.validation.min !== undefined && num < field.validation.min) return false
      if (field.validation.max !== undefined && num > field.validation.max) return false
    }

    // 正则验证
    if (field.validation.pattern) {
      const regex = new RegExp(field.validation.pattern)
      if (!regex.test(String(value))) return false
    }
  }

  // select 类型验证选项
  if (field.type === 'select' && field.options) {
    if (!field.options.includes(value)) return false
  }

  return true
}

/**
 * 验证输入是否是有效数字
 */
export function isValidNumber(value: any): boolean {
  if (typeof value === 'number') return !isNaN(value)
  if (typeof value === 'string') {
    const num = parseFloat(value)
    return !isNaN(num) && isFinite(num)
  }
  return false
}

/**
 * 验证输入是否在合理范围内
 */
export function isInReasonableRange(
  value: number,
  fieldName: string
): boolean {
  const ranges: Record<string, { min: number; max: number }> = {
    weight: { min: 20, max: 300 },      // kg
    reps: { min: 1, max: 100 },
    sets: { min: 1, max: 20 },
    duration: { min: 1, max: 300 },     // 分钟
    waist: { min: 40, max: 200 },      // cm
    chest: { min: 40, max: 200 },
    hip: { min: 40, max: 200 },
    bicep: { min: 10, max: 80 },
    thigh: { min: 20, max: 100 },
    calf: { min: 10, max: 60 }
  }

  const range = ranges[fieldName]
  if (!range) return true  // 没有范围限制，默认通过

  return value >= range.min && value <= range.max
}

/**
 * 解析数字输入（处理各种格式）
 */
export function parseNumberInput(input: string): number | null {
  // 移除空格
  const trimmed = input.trim()

  // 尝试直接解析
  const num = parseFloat(trimmed)
  if (!isNaN(num) && isFinite(num)) {
    return num
  }

  // 处理中文数字（简单处理）
  const chineseNumbers: Record<string, number> = {
    '一': 1, '二': 2, '三': 3, '四': 4, '五': 5,
    '六': 6, '七': 7, '八': 8, '九': 9, '十': 10,
    '零': 0, '百': 100
  }

  // 只处理简单情况，如"七十五" -> 75
  let result = 0
  for (const char of trimmed) {
    if (chineseNumbers[char] !== undefined) {
      if (char === '十') {
        result = result === 0 ? 10 : result * 10
      } else {
        result = result * 10 + chineseNumbers[char]
      }
    }
  }

  return result > 0 ? result : null
}

/**
 * 解析单位
 */
export function parseUnit(input: string): string | null {
  const normalized = input.trim().toLowerCase()

  if (normalized === 'kg' || normalized === '公斤' || normalized === '千克') {
    return 'kg'
  }

  if (normalized === '斤' || normalized === '市斤') {
    return '斤'
  }

  if (normalized === 'lbs' || normalized === '磅') {
    return 'lbs'
  }

  if (normalized === 'cm' || normalized === '厘米' || normalized === '公分') {
    return 'cm'
  }

  if (normalized === 'inch' || normalized === '英寸') {
    return 'inch'
  }

  return null
}

/**
 * 检查是否是有效单位
 */
export function isValidUnit(input: string): boolean {
  return parseUnit(input) !== null
}
