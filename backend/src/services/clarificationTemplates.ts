import { ClarifyReason, ClarificationTemplate, ClarificationContext } from '../types/clarification'

// ============================================
// 追问话术模板
// ============================================

const GENERAL_TEMPLATES: Record<ClarifyReason, ClarificationTemplate> = {
  MISSING_NUMBER: {
    reason: 'MISSING_NUMBER',
    templates: [
      '请问具体是多少？',
      '能告诉我具体的数字吗？',
      '这个数值是多少呢？',
      '方便说一下重量/次数/体重吗？'
    ]
  },

  MISSING_UNIT: {
    reason: 'MISSING_UNIT',
    templates: [
      '单位是公斤(kg)还是斤？',
      '请问是kg还是lbs？',
      '用什么单位呢？',
      '公斤还是磅？'
    ]
  },

  MISSING_DATE: {
    reason: 'MISSING_DATE',
    templates: [
      '请问是哪一天？',
      '具体是哪天练的/记录的？',
      '什么时候的事？',
      '能说得更具体一点吗？'
    ]
  },

  MISSING_MUSCLE: {
    reason: 'MISSING_MUSCLE',
    templates: [
      '你想练哪个部位呢？',
      '请问是胸、背、腿还是...？',
      '有特别想练的肌群吗？',
      '练什么部位？'
    ]
  },

  MISSING_EXERCISE: {
    reason: 'MISSING_EXERCISE',
    templates: [
      '能说下具体的动作吗？',
      '你做了哪些动作？',
      '练的什么动作呢？',
      '可以告诉我动作名称吗？'
    ]
  },

  MISSING_PLAN: {
    reason: 'MISSING_PLAN',
    templates: [
      '你想关联哪个训练计划？',
      '有具体的计划吗？',
      '要加入哪个计划？'
    ]
  },

  AMBIGUOUS_INTENT: {
    reason: 'AMBIGUOUS_INTENT',
    templates: [
      '我有点没理解你的意思，你想...？',
      '抱歉没太明白，能再说一下吗？',
      '你是想记录还是查询呢？',
      '能具体说一下吗？'
    ]
  },

  MULTIPLE_INTENTS: {
    reason: 'MULTIPLE_INTENTS',
    templates: [
      '我理解你想做两件事，你想先处理哪个？',
      '信息比较多，我们一个个来，先说...？',
      '一次处理一件事，先说哪个？'
    ]
  },

  INCOMPLETE_SENTENCE: {
    reason: 'INCOMPLETE_SENTENCE',
    templates: [
      '然后呢？',
      '后面是什么？',
      '能继续说吗？',
      '请继续...'
    ]
  },

  CONTRADICTORY_INFO: {
    reason: 'CONTRADICTORY_INFO',
    templates: [
      '我有点困惑，你说...但又说...，能解释一下吗？',
      '这两个信息好像有点矛盾，确认一下...？',
      '数据有点对不上，请再确认一下...？'
    ]
  },

  INVALID_INPUT: {
    reason: 'INVALID_INPUT',
    templates: [
      '这个格式不太对，请输入数字，比如 70',
      '请输入正确的数值，比如 65.5',
      '格式不对，是数字吗？比如 68',
      '请输入数字，不要包含字母'
    ]
  },

  PARTIAL_CONFIRMATION: {
    reason: 'PARTIAL_CONFIRMATION',
    templates: [
      '好的，{value} 对吗？',
      '明白了，{value}，确认一下？',
      '收到，{value}，是这个吧？'
    ]
  },

  DEFER_LATER: {
    reason: 'DEFER_LATER',
    templates: [
      '好的，有需要随时叫我',
      '没问题，想起来的时候告诉我',
      '好的，我等你，不着急'
    ]
  }
}

/**
 * 获取指定原因的话术模板
 */
export function getTemplate(reason: ClarifyReason): ClarificationTemplate {
  return GENERAL_TEMPLATES[reason] || GENERAL_TEMPLATES.AMBIGUOUS_INTENT
}

/**
 * 随机选择一条话术
 */
export function selectRandomTemplate(templates: string[]): string {
  return templates[Math.floor(Math.random() * templates.length)]
}

/**
 * 生成追问话术
 */
export function generateQuestion(
  reason: ClarifyReason,
  context?: ClarificationContext,
  extractedValue?: any
): string {
  const template = getTemplate(reason)

  // 如果有待确认的值，使用确认话术
  if (extractedValue !== undefined && reason === 'PARTIAL_CONFIRMATION') {
    const confirmTemplate = selectRandomTemplate(template.templates)
    return confirmTemplate.replace('{value}', String(extractedValue))
  }

  // 上下文感知话术
  if (context) {
    return adaptTemplateWithContext(selectRandomTemplate(template.templates), context, extractedValue)
  }

  return selectRandomTemplate(template.templates)
}

/**
 * 根据上下文调整话术
 */
function adaptTemplateWithContext(
  template: string,
  context: ClarificationContext,
  extractedValue?: any
): string {
  // 如果有待确认的值，先确认
  if (extractedValue !== undefined) {
    const valueStr = formatExtractedValue(extractedValue)
    return `好的，${valueStr}，确认一下？`
  }

  // 获取已提取的实体，添加到话术中
  if (context.extractedEntities && Object.keys(context.extractedEntities).length > 0) {
    const extracted = formatExtractedEntities(context.extractedEntities)
    if (extracted && template.includes('[EXTRACTED]')) {
      return template.replace('[EXTRACTED]', extracted)
    }
  }

  return template
}

/**
 * 格式化已提取的实体
 */
function formatExtractedEntities(entities: Record<string, any>): string | null {
  const parts: string[] = []

  if (entities.weight !== undefined) {
    parts.push(`${entities.weight}${entities.unit || 'kg'}`)
  }

  if (entities.muscle) {
    parts.push(`${entities.muscle}`)
  }

  if (entities.exercise) {
    parts.push(`${entities.exercise}`)
  }

  return parts.length > 0 ? parts.join('、') : null
}

/**
 * 格式化单个提取值
 */
function formatExtractedValue(value: any): string {
  if (typeof value === 'number') {
    return String(value)
  }
  return String(value)
}

/**
 * 生成选项卡片话术
 */
export function generateOptionQuestion(
  question: string,
  options: Array<{ id: string; label: string }>
): string {
  const optionLabels = options.map(o => o.label).join('、')
  return `${question}${optionLabels}？`
}

/**
 * 生成无效输入提示
 */
export function generateInvalidInputMessage(fieldName: string): string {
  const messages: Record<string, string[]> = {
    weight: [
      '请输入有效的体重数字，比如 70',
      '体重应该是数字，比如 65.5',
      '请输入数字，不要包含其他字符'
    ],
    reps: [
      '请输入有效的次数，比如 10',
      '次数应该是数字，比如 8',
      '请输入数字作为次数'
    ],
    default: [
      '这个格式不太对，请重新输入',
      '格式不对，请检查一下',
      '输入格式有误，请重新输入'
    ]
  }

  const msgs = messages[fieldName] || messages.default
  return selectRandomTemplate(msgs)
}

/**
 * 生成"稍后再说"回复
 */
export function generateDeferLaterMessage(): string {
  return selectRandomTemplate(GENERAL_TEMPLATES.DEFER_LATER.templates)
}

/**
 * 生成取消回复
 */
export function generateCancelMessage(): string {
  return '好的，有需要随时叫我。'
}

/**
 * 生成打断追问回复
 */
export function generateInterruptMessage(newAction: string): string {
  return `好的，来${newAction}。`
}
