import { PrismaClient } from '@prisma/client'
import { env } from '../config/env'
import { logger } from '../logger'
import { parseTrainingInput } from './trainingRecordParser'

const prisma = new PrismaClient()

// ============================================
// JSON 增量提取缓存
// ============================================

interface ExtractionCache {
  [requestId: string]: {
    extractedJsonList: string[]
    nextStartPos: number
    totalLength: number
    completed: boolean
    updatedAt: string
  }
}

const CACHE_FILE = 'cache/extracted-json-cache.json'

/**
 * 加载提取缓存
 */
function loadExtractionCache(): ExtractionCache {
  try {
    const fs = require('fs')
    const path = require('path')
    const cachePath = path.resolve(__dirname, '..', CACHE_FILE)
    if (fs.existsSync(cachePath)) {
      const data = fs.readFileSync(cachePath, 'utf-8')
      return JSON.parse(data)
    }
  } catch (e) {
    logger.warn('[ExtractionCache] 加载缓存失败:', e)
  }
  return {}
}

/**
 * 保存提取缓存
 */
function saveExtractionCache(cache: ExtractionCache): void {
  try {
    const fs = require('fs')
    const path = require('path')
    const cachePath = path.resolve(__dirname, '..', CACHE_FILE)
    const dir = path.dirname(cachePath)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    fs.writeFileSync(cachePath, JSON.stringify(cache, null, 2))
  } catch (e) {
    logger.warn('[ExtractionCache] 保存缓存失败:', e)
  }
}

/**
 * 从指定位置开始查找下一个 JSON 代码块
 */
function findNextJsonBlock(text: string, startPos: number): { content: string | null; endPos: number } {
  const fromText = text.slice(startPos)
  // 查找下一个 ```json 或 ``` 标记
  const codeBlockMatch = fromText.match(/```json\s*([\s\S]*?)\s*```/i)
  if (codeBlockMatch) {
    const content = codeBlockMatch[1].trim()
    const endPos = startPos + fromText.indexOf(codeBlockMatch[0]) + codeBlockMatch[0].length
    logger.debug('[findNextJsonBlock] 找到 JSON 块', { length: content.length, endPos })
    return { content, endPos }
  }
  // 没有更多代码块了
  return { content: null, endPos: text.length }
}

/**
 * 增量提取 JSON（每次调用提取一个）
 * @param requestId 请求唯一标识
 * @param text 原始文本
 * @returns 提取的 JSON 内容，如果已全部提取则返回 null
 */
function extractJsonIncremental(requestId: string, text: string): string | null {
  const cache = loadExtractionCache()
  const cached = cache[requestId]

  let startPos = 0
  let extractedList: string[] = []

  // 如果有缓存，从缓存中恢复状态
  if (cached && cached.totalLength === text.length) {
    if (cached.completed) {
      logger.debug('[extractJsonIncremental] 请求已全部提取完成', { requestId })
      return null
    }
    startPos = cached.nextStartPos
    extractedList = cached.extractedJsonList
    logger.debug('[extractJsonIncremental] 从缓存恢复', { startPos, extractedCount: extractedList.length })
  } else {
    logger.debug('[extractJsonIncremental] 新请求', { totalLength: text.length })
  }

  // 查找下一个 JSON 块
  const { content, endPos } = findNextJsonBlock(text, startPos)

  if (content === null) {
    // 没有更多 JSON 块了
    cache[requestId] = {
      extractedJsonList: extractedList,
      nextStartPos: text.length,
      totalLength: text.length,
      completed: true,
      updatedAt: new Date().toISOString()
    }
    saveExtractionCache(cache)
    logger.debug('[extractJsonIncremental] 所有 JSON 已提取完成')
    return null
  }

  // 更新缓存
  extractedList.push(content)
  cache[requestId] = {
    extractedJsonList: extractedList,
    nextStartPos: endPos,
    totalLength: text.length,
    completed: false,
    updatedAt: new Date().toISOString()
  }
  saveExtractionCache(cache)
  logger.info('[extractJsonIncremental] 提取完成', { extractedCount: extractedList.length })

  return content
}

/**
 * 获取提取进度
 */
function getExtractionProgress(requestId: string, text: string): { extracted: number; total: number; completed: boolean } {
  const cache = loadExtractionCache()
  const cached = cache[requestId]

  if (!cached || cached.totalLength !== text.length) {
    return { extracted: 0, total: 0, completed: false }
  }

  // 统计总共有多少个 JSON 块
  const allMatches = text.match(/```json\s*[\s\S]*?\s*```/gi) || []
  return {
    extracted: cached.extractedJsonList.length,
    total: allMatches.length,
    completed: cached.completed
  }
}

/**
 * 重置提取状态
 */
function resetExtractionState(requestId: string): void {
  const cache = loadExtractionCache()
  if (cache[requestId]) {
    delete cache[requestId]
    saveExtractionCache(cache)
    logger.info('[resetExtractionState] 已重置:', requestId)
  }
}

// ============================================
// 工具函数
// ============================================

/**
 * 安全解析 JSON，处理 AI 返回的常见格式问题
 */
function safeJsonParse(text: string): Record<string, any> | null {
  // 优先尝试提取 ```json ... ``` 之间的内容
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/i)
  let cleaned = codeBlockMatch ? codeBlockMatch[1].trim() : text

  // 尝试直接解析
  try {
    return JSON.parse(cleaned)
  } catch (e) {
    // 继续尝试修复
  }

  // 修复常见问题： trailing comma, unquoted keys
  try {
    // 移除 trailing comma
    cleaned = cleaned.replace(/,(\s*[}\]])/g, '$1')
    // 尝试解析修复后的文本
    return JSON.parse(cleaned)
  } catch (e) {
    // 继续
  }

  // 如果还是失败，返回 null
  return null
}

/**
 * 从文本中提取 JSON 字符串
 * 优先提取 ```json ... ``` 之间的内容，否则使用非贪婪匹配 {...}
 */
function extractJson(text: string): string | null {
  // 优先尝试提取 ```json ... ``` 之间的内容（处理 AI 返回的嵌套 JSON）
  const codeBlockMatch = text.match(/```json\s*([\s\S]*?)\s*```/i)
  if (codeBlockMatch) {
    const extracted = codeBlockMatch[1].trim()
    logger.debug('[extractJson] 从代码块提取:', extracted)
    return extracted
  }

  // 尝试从 {"response": "..."} 这样的嵌套格式中提取
  const nestedMatch = text.match(/"response"\s*:\s*"([\s\S]*?)"\s*[,}]/i)
  if (nestedMatch) {
    // 递归从嵌套内容中提取 JSON
    const nestedContent = nestedMatch[1].replace(/\\n/g, '\n').replace(/\\"/g, '"')
    logger.debug('[extractJson] 从嵌套响应提取原始内容')
    return extractJson(nestedContent)
  }

  // 否则使用非贪婪匹配 {...}
  const jsonMatch = text.match(/\{[\s\S]*?\}/)
  if (jsonMatch) {
    logger.debug('[extractJson] 从括号提取:', jsonMatch[0])
    return jsonMatch[0]
  }

  return null
}

// ============================================
// AI 网关服务 - 调用外部 AI 接口
// ============================================

export interface AIRequest {
  userId: string
  message: string
  conversationHistory?: Array<{ role: string; content: string }>
  intent?: string  // CHITCHAT 时使用健身教练提示词
}

export interface AIResponse {
  content: string
  intent?: string
  error?: string
}

// 意图关键词映射
const INTENT_KEYWORDS: Record<string, string[]> = {
  RECORD_WEIGHT: ['体重', 'kg', '公斤', '斤', '磅'],
  RECORD_TRAINING: ['练', '训练', '卧推', '深蹲', '硬拉', '记录'],
  RECORD_DIET: ['吃', '饮食', '早餐', '午餐', '晚餐', '热量'],
  TRAINING_RECOMMEND: ['推荐', '建议', '练什么', '动.*好'],
  QUERY_RECOVERY: ['恢复', '状态', '疲劳', '酸'],
  QUERY_PR: ['pr', '记录', '最好', '突破', '个人'],
  QUERY_WEIGHT: ['体重', '多重', '多少斤'],
  QUERY_TREND: ['趋势', '变化', '走势'],
  GREETING: ['你好', '早上好', '下午好', '晚上好', '嗨', 'hi', 'hello'],
}

/**
 * 构建系统提示词
 */
function buildSystemPrompt(): string {
  return `你是一个健身AI助手，名叫"AI己"。你的特点是：
1. 专业、简洁、有耐心
2. 善于理解用户的健身目标和训练记录
3. 可以识别用户的训练意图（如记录训练、查询状态、推荐训练等）
4. 回复简洁有力，不啰嗦
5. 可以生成结构化的卡片回复

用户正在健身记录场景中与您对话。请根据用户的消息给出合适的回复。`
}

/**
 * 构建健身教练闲聊提示词
 */
function buildChitchatSystemPrompt(): string {
  return `你是一位专业、友善的健身教练，名叫"AI己"。用户正在和你闲聊，请基于用户的健身数据用自然、亲切的方式回应。

你的特点：
1. 像朋友聊天一样亲切自然，不生硬
2. 适当给予鼓励和肯定
3. 根据用户情况分享实用建议
4. 用轻松的话题拉近距离
5. 偶尔提醒健身小知识

你可以：
- 聊健身进展、分享小技巧
- 给予持续训练的鼓励
- 轻松回应用户的日常对话
- 适时引导回到健身话题

回复要简洁，自然、有温度，像朋友聊天一样。不要使用列表或结构化的回复格式，用自然的句子交流。`
}

/**
 * 构建用户上下文
 */
async function buildUserContext(userId: string): Promise<string> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        nickname: true,
        goal: true,
        level: true,
        targetWeight: true,
        height: true
      }
    })

    if (!user) {
      return '用户信息: 未找到用户'
    }

    // 目标映射
    const goalLabels: Record<string, string> = {
      LOSE_FAT: '减脂',
      GAIN_MUSCLE: '增肌',
      BODY_SHAPE: '塑形',
      IMPROVE_FITNESS: '提升体能'
    }

    // 获取最近的训练记录
    const recentLogs = await prisma.trainingLog.findMany({
      where: { userId },
      orderBy: { startedAt: 'desc' },
      take: 3,
      include: {
        logEntries: {
          take: 3,
          orderBy: { setNumber: 'asc' }
        }
      }
    })

    let recentTrainingText = '暂无训练记录'
    if (recentLogs.length > 0) {
      recentTrainingText = recentLogs.slice(0, 2).map(log => {
        const exercises = log.logEntries.slice(0, 2).map(
          e => `${e.exerciseName}: ${e.weight}kg×${e.reps}`
        ).join(', ')
        const date = log.startedAt.toISOString().split('T')[0]
        return `${date} - ${exercises}${log.logEntries.length > 2 ? '...' : ''}`
      }).join('\n')
    }

    // 获取最新体重
    const latestWeight = await prisma.weightRecord.findFirst({
      where: { userId },
      orderBy: { recordedAt: 'desc' }
    })

    // 获取最近补剂记录
    const recentSupplements = await prisma.supplementRecord.findMany({
      where: { userId },
      orderBy: { date: 'desc' },
      take: 5
    })

    let supplementText = '暂无补剂记录'
    if (recentSupplements.length > 0) {
      supplementText = recentSupplements.map(r => {
        const date = r.date.toISOString().split('T')[0]
        const dosage = r.dosage ? ` (${r.dosage})` : ''
        const timing = r.timing ? ` ${r.timing}` : ''
        return `${date} - ${r.supplement}${dosage}${timing}`
      }).join('\n')
    }

    return `
当前用户信息：
- 昵称: ${user.nickname || '用户'}
- 健身目标: ${user.goal ? goalLabels[user.goal] || user.goal : '未设置'}
- 当前体重: ${latestWeight ? `${latestWeight.weight}kg` : '未知'}
- 目标体重: ${user.targetWeight ? `${user.targetWeight}kg` : '未设置'}

最近训练记录：
${recentTrainingText}

补剂使用情况：
${supplementText}
`.trim()
  } catch (error) {
    console.error('[aiGateway] buildUserContext error:', error)
    return '用户信息: 获取失败'
  }
}

/**
 * 调用外部 AI 接口
 */
export async function callAI(request: AIRequest): Promise<AIResponse> {
  const { userId, message, conversationHistory } = request

  // 检查是否配置了 API Key
  if (!env.aiApiKey) {
    return {
      content: '',
      error: 'AI_API_KEY 未配置'
    }
  }

  try {
    // 构建上下文
    const userContext = await buildUserContext(userId)
    let systemPrompt = buildSystemPrompt()
    if (request.intent === 'CHITCHAT') {
      systemPrompt = buildChitchatSystemPrompt()
    }

    // 构建消息列表
    const messages: Array<{ role: string; content: string }> = [
      { role: 'system', content: `${systemPrompt}\n\n${userContext}` }
    ]

    // 添加对话历史
    if (conversationHistory && conversationHistory.length > 0) {
      // 只保留最近 6 条历史
      const recentHistory = conversationHistory.slice(-6)
      messages.push(...recentHistory)
    }

    // 添加当前用户消息
    messages.push({ role: 'user', content: message })

    // 调用 AI API
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30000) // 30秒超时

    const response = await fetch(env.aiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.aiApiKey}`
      },
      body: JSON.stringify({
        model: env.aiModel,
        messages,
        temperature: env.aiTemperature,
        max_tokens: env.aiMaxTokens
      }),
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[aiGateway] API error:', response.status, errorText)
      return {
        content: '',
        error: `AI服务调用失败: ${response.status}`
      }
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    const content = data.choices?.[0]?.message?.content?.trim() || ''

    if (!content) {
      return {
        content: '',
        error: 'AI返回内容为空'
      }
    }

    // 检测意图
    const detectedIntent = detectIntent(message + ' ' + content)

    return {
      content,
      intent: detectedIntent
    }
  } catch (error: any) {
    if (error.name === 'AbortError') {
      console.error('[aiGateway] Request timeout')
      return {
        content: '',
        error: 'AI服务请求超时'
      }
    }
    console.error('[aiGateway] Exception:', error)
    return {
      content: '',
      error: `AI服务异常: ${error.message}`
    }
  }
}

/**
 * 从消息中检测意图
 */
function detectIntent(text: string): string | undefined {
  const lowerText = text.toLowerCase()

  for (const [intent, keywords] of Object.entries(INTENT_KEYWORDS)) {
    for (const keyword of keywords) {
      if (keyword.includes('.*')) {
        // 正则表达式
        const regex = new RegExp(keyword, 'i')
        if (regex.test(text)) {
          return intent
        }
      } else if (lowerText.includes(keyword.toLowerCase())) {
        return intent
      }
    }
  }

  return undefined
}

/**
 * 检查 AI 服务是否可用
 */
export function isAIServiceAvailable(): boolean {
  return Boolean(env.aiApiKey && env.aiApiUrl)
}

// ============================================
// AI 意图判断和实体解析
// ============================================

export type IntentType =
  | 'RECORD_WEIGHT'
  | 'RECORD_TRAINING'
  | 'RECORD_MEASUREMENT'
  | 'RECORD_DIET'
  | 'TRAINING_RECOMMEND'
  | 'QUERY_RECOVERY'
  | 'QUERY_PR'
  | 'QUERY_WEIGHT'
  | 'QUERY_TREND'
  | 'GREETING'
  | 'CHITCHAT'
  | 'UNKNOWN'

const INTENT_LIST = [
  'RECORD_WEIGHT',
  'RECORD_TRAINING',
  'RECORD_MEASUREMENT',
  'RECORD_DIET',
  'TRAINING_RECOMMEND',
  'QUERY_RECOVERY',
  'QUERY_PR',
  'QUERY_WEIGHT',
  'QUERY_TREND',
  'GREETING',
  'CHITCHAT'
]

/**
 * AI 意图判断
 * @param userId 用户ID
 * @param message 用户消息
 * @returns 意图类型和置信度
 */
export async function determineIntent(
  userId: string,
  message: string
): Promise<{ intent: IntentType; confidence: number }> {
  logger.info('[determineIntent] 开始意图判断', { userId, message })

  // 完全依赖 AI 判断意图，不使用本地 regex 降级
  const userContext = await buildUserContext(userId)

  const response = await callAIInternal({
    systemPrompt: `你是一个意图分类器。用户消息可能属于以下意图之一：
- RECORD_WEIGHT: 记录体重（如"今天体重65kg"、"称重130斤"、"记体重83公斤"）
- RECORD_TRAINING: 记录训练（如"今天练了卧推60kg 8个"、"深蹲100kg 5下"）
- RECORD_MEASUREMENT: 记录围度（如"今天腰围70cm"、"测了下臂围35"）
- RECORD_DIET: 记录饮食（如"吃了2000大卡"、"午餐吃了米饭和鸡胸"）
- TRAINING_RECOMMEND: 请求训练推荐（如"今天练什么好"、"推荐个训练"）
- QUERY_RECOVERY: 查询恢复状态（如"肌肉恢复得怎么样"、"今天状态好吗"）
- QUERY_PR: 查询个人记录（如"我的pr是多少"、"卧推最好成绩"）
- QUERY_WEIGHT: 查询体重（如"最近体重多少"、"体重有变化吗"）
- QUERY_TREND: 查询趋势（如"体重趋势怎么样"、"训练效果如何"）
- GREETING: 问候（如"你好"、"早上好"、"嗨"）
- CHITCHAT: 闲聊或其他

请判断用户消息的意图，返回 JSON 格式：
{"intent": "意图名", "confidence": 0.0-1.0}

只返回 JSON，不要有其他内容。`,
    userMessage: message,
    userContext
  })

  logger.info('[determineIntent] AI 原始响应:', { response })

  // 解析 JSON 响应
  const jsonStr = extractJson(response)
  if (jsonStr) {
    const parsed = safeJsonParse(jsonStr) as { intent: string; confidence: number } | null
    if (parsed && parsed.intent) {
      const validIntent = INTENT_LIST.includes(parsed.intent) ? parsed.intent : 'UNKNOWN'
      logger.info('[determineIntent] 解析成功:', { intent: validIntent, confidence: parsed.confidence })
      return {
        intent: validIntent as IntentType,
        confidence: Math.max(0, Math.min(1, parsed.confidence || 0))
      }
    }
    logger.warn('[determineIntent] JSON 解析失败或无有效 intent')
  } else {
    logger.warn('[determineIntent] 未匹配到 JSON 响应')
  }

  return { intent: 'UNKNOWN', confidence: 0 }
}

/**
 * AI 实体解析
 * @param userId 用户ID
 * @param message 用户消息
 * @param intent 意图类型
 * @returns 解析出的实体数据
 */
export async function parseEntities(
  userId: string,
  message: string,
  intent: IntentType
): Promise<Record<string, any>> {
  logger.info('[parseEntities] 开始解析实体', { userId, message, intent })

  // 如果 AI 服务不可用，使用本地解析
  if (!isAIServiceAvailable()) {
    logger.warn('[parseEntities] AI 服务不可用，使用本地解析')
    const localResult = parseEntitiesLocally(message, intent)
    logger.info('[parseEntities] 本地解析结果:', localResult)
    return localResult
  }

  const promptByIntent: Record<string, string> = {
    RECORD_WEIGHT: `从消息中提取体重数据。返回 JSON 格式：
{"weight": 数字, "unit": "kg或斤", "date": "日期或今天"}
如果无法提取，返回空对象 {}`,

    RECORD_TRAINING: `从消息中提取训练动作数据。返回 JSON 格式：
{"exercises": [{"name": "动作名", "sets": [{"weight": 数字, "reps": 数字}]}], "date": "日期或今天"}
只提取有明确重量和次数的动作，忽略不完整的。如果无法提取，返回空对象 {}。`,

    RECORD_MEASUREMENT: `从消息中提取围度数据。返回 JSON 格式：
{"measurements": {"waist": 数字, "hip": 数字, "chest": 数字, ...}, "date": "日期或今天"}
只提取有明确数值的围度。如果无法提取，返回空对象 {}。`,

    RECORD_DIET: `从消息中提取饮食数据。返回 JSON 格式：
{"calories": 数字, "meals": [{"type": "早餐/午餐/晚餐/加餐", "foods": ["食物1", "食物2"]}], "date": "日期或今天"}
如果无法提取，返回空对象 {}。`,

    QUERY_PR: `从消息中提取要查询的动作。返回 JSON 格式：
{"exerciseName": "动作名"}
如果消息中没有指定动作，返回空对象 {}。`,

    QUERY_WEIGHT: `返回空对象 {}，体重查询不需要额外参数。`,

    QUERY_TREND: `返回空对象 {}，趋势查询不需要额外参数。`
  }

  const prompt = promptByIntent[intent] || '返回空对象 {}'

  try {
    const userContext = await buildUserContext(userId)

    const response = await callAIInternal({
      systemPrompt: prompt,
      userMessage: message,
      userContext
    })

    logger.info('[parseEntities] AI 原始响应:', { response })

    // 解析 JSON 响应
    const jsonStr = extractJson(response)
    if (jsonStr) {
      logger.debug('[parseEntities] 提取的 JSON:', jsonStr)
      const result = safeJsonParse(jsonStr)
      if (result) {
        logger.info('[parseEntities] 解析成功:', result)
        return result
      }
      logger.warn('[parseEntities] JSON 解析失败')
    } else {
      logger.warn('[parseEntities] 未匹配到 JSON 响应')
    }

    logger.warn('[parseEntities] AI 解析失败，降级到本地解析')
    const localResult = parseEntitiesLocally(message, intent)
    logger.info('[parseEntities] 本地解析结果:', localResult)
    return localResult
  } catch (error) {
    logger.error('[aiGateway] parseEntities error:', { error: String(error) })
    // 降级到本地解析
    const localResult = parseEntitiesLocally(message, intent)
    logger.info('[parseEntities] 异常降级到本地解析:', localResult)
    return localResult
  }
}

/**
 * 内部调用 AI 接口（不经过完整流程）
 */
async function callAIInternal(request: {
  systemPrompt: string
  userMessage: string
  userContext: string
}): Promise<string> {
  if (!env.aiApiKey) {
    throw new Error('AI_API_KEY 未配置')
  }

  const messages = [
    { role: 'system' as const, content: `${request.systemPrompt}\n\n用户信息：\n${request.userContext}` },
    { role: 'user' as const, content: request.userMessage }
  ]

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 20000) // 20秒超时

  try {
    const response = await fetch(env.aiApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${env.aiApiKey}`
      },
      body: JSON.stringify({
        model: env.aiModel,
        messages,
        temperature: 0.3, // 低温度以获得更确定的输出
        max_tokens: 300
      }),
      signal: controller.signal
    })

    clearTimeout(timeout)

    if (!response.ok) {
      throw new Error(`AI服务调用失败: ${response.status}`)
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> }
    return data.choices?.[0]?.message?.content?.trim() || ''
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * 检测意图（降级方案 - regex）
 */
function detectIntentFallback(text: string): IntentType {
  const lowerText = text.toLowerCase()

  // 优先检测问候
  if (['你好', '早上好', '下午好', '晚上好', '嗨', 'hi', 'hello'].some(k => lowerText.includes(k))) {
    return 'GREETING'
  }

  // 检测体重相关
  if (['体重', 'kg', '公斤', '斤', '磅'].some(k => lowerText.includes(k)) && !['训练', '练'].some(k => lowerText.includes(k))) {
    return 'RECORD_WEIGHT'
  }

  // 检测训练相关
  if (['练', '训练', '卧推', '深蹲', '硬拉'].some(k => lowerText.includes(k))) {
    return 'RECORD_TRAINING'
  }

  // 检测饮食相关
  if (['吃', '饮食', '早餐', '午餐', '晚餐', '热量'].some(k => lowerText.includes(k))) {
    return 'RECORD_DIET'
  }

  // 检测推荐相关
  if (['推荐', '建议', '练什么', '动.*好'].some(k => lowerText.includes(k))) {
    return 'TRAINING_RECOMMEND'
  }

  // 检测恢复查询
  if (['恢复', '状态', '疲劳', '酸'].some(k => lowerText.includes(k))) {
    return 'QUERY_RECOVERY'
  }

  // 检测PR查询
  if (['pr', '记录', '最好', '突破', '个人'].some(k => lowerText.includes(k))) {
    return 'QUERY_PR'
  }

  // 检测体重查询
  if (['体重', '多重', '多少斤'].some(k => lowerText.includes(k))) {
    return 'QUERY_WEIGHT'
  }

  // 检测趋势查询
  if (['趋势', '变化', '走势'].some(k => lowerText.includes(k))) {
    return 'QUERY_TREND'
  }

  return 'CHITCHAT'
}

/**
 * 本地解析实体数据
 */
function parseEntitiesLocally(message: string, intent: IntentType): Record<string, any> {
  switch (intent) {
    case 'RECORD_WEIGHT': {
      // 匹配体重数字
      const weightMatch = message.match(/(\d+\.?\d*)\s*(kg|公斤|斤|磅)/i)
      if (weightMatch) {
        let weight = parseFloat(weightMatch[1])
        const unit = weightMatch[2].toLowerCase()

        // 统一转换为 kg
        if (unit === '斤') {
          weight = weight / 2
        } else if (unit === '磅') {
          weight = weight / 2.205
        }

        return { weight, unit: 'kg' }
      }
      return {}
    }

    case 'RECORD_TRAINING': {
      // 使用 trainingRecordParser 解析训练数据
      const parsed = parseTrainingInput(message)
      if (parsed.exercises.length > 0) {
        return { exercises: parsed.exercises }
      }
      return {}
    }

    default:
      return {}
  }
}

// ============================================
// 增量提取导出
// ============================================

export { extractJsonIncremental, getExtractionProgress, resetExtractionState }
