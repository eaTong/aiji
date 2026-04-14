import * as trainingLogService from './trainingLogService'
import * as trainingRecordParser from './trainingRecordParser'
import { createAIMessage } from './chatService'

// ============================================
// Chat 训练服务 - 从聊天消息保存训练记录
// ============================================

export interface SaveTrainingResult {
  saved: boolean
  trainingId?: string
  exercises: Array<{
    name: string
    sets: number
    totalVolume: number
  }>
  totalVolume?: number
  duration?: number
  error?: string
}

/**
 * 从聊天消息保存训练记录
 * @param userId 用户ID
 * @param message 原始消息
 * @param entities 解析出的实体（可选，用于快速路径）
 */
export async function saveTrainingFromChat(
  userId: string,
  message: string,
  entities?: Record<string, any>
): Promise<SaveTrainingResult> {
  try {
    // 1. 解析训练数据
    const parsed = trainingRecordParser.parseTrainingInput(message)

    // 2. 验证数据
    const validation = trainingRecordParser.validateParsedData(parsed)
    if (!validation.valid) {
      return {
        saved: false,
        exercises: [],
        error: validation.errors.join('; ')
      }
    }

    if (parsed.exercises.length === 0) {
      return {
        saved: false,
        exercises: [],
        error: '未识别到有效的训练动作'
      }
    }

    // 3. 匹配动作到数据库
    const matchedResults = await trainingRecordParser.matchExercisesToDatabase(
      parsed.exercises,
      userId
    )

    // 4. 检查是否有匹配成功的动作
    const matchedExercises = matchedResults.filter(r => r.matched && !r.error)
    if (matchedExercises.length === 0) {
      const unmatchedNames = matchedResults
        .filter(r => r.error)
        .map(r => r.original.name)
        .join('、')

      return {
        saved: false,
        exercises: [],
        error: `未能匹配到有效的训练动作: ${unmatchedNames || '未知'}`
      }
    }

    // 5. 启动训练会话
    const training = await trainingLogService.startTraining(userId)

    // 6. 添加每个动作的每个 set
    const savedExercises: SaveTrainingResult['exercises'] = []

    for (const result of matchedExercises) {
      if (!result.matched) continue

      const { original, matched } = result
      let setNumber = 1
      let exerciseVolume = 0

      for (const set of original.sets) {
        await trainingLogService.addLogEntry(
          training.id,
          matched.id,
          matched.name,
          setNumber++,
          set.weight,
          set.reps,
          set.isWarmup
        )
        // 非热身组计算容量
        if (!set.isWarmup) {
          exerciseVolume += set.weight * set.reps
        }
      }

      savedExercises.push({
        name: matched.name,
        sets: original.sets.length,
        totalVolume: Math.round(exerciseVolume * 10) / 10
      })
    }

    // 7. 完成训练会话
    const completedTraining = await trainingLogService.completeTraining(training.id)

    // 8. 返回结果
    return {
      saved: true,
      trainingId: training.id,
      exercises: savedExercises,
      totalVolume: completedTraining.totalVolume || 0,
      duration: completedTraining.duration || 0
    }
  } catch (error: any) {
    console.error('[chatTrainingService] saveTrainingFromChat error:', error)
    return {
      saved: false,
      exercises: [],
      error: `保存训练记录失败: ${error.message || '未知错误'}`
    }
  }
}

/**
 * 生成训练保存确认的卡片数据
 */
export function buildTrainingConfirmationCard(
  result: SaveTrainingResult
): {
  type: 'card'
  cardType: 'training-editable'
  cardData: Record<string, any>
  actions: Array<{ id: string; label: string; action: string; target?: string }>
} {
  const { saved, exercises, totalVolume, duration, error } = result

  if (!saved) {
    return {
      type: 'card',
      cardType: 'training-editable',
      cardData: {
        date: new Date().toISOString().split('T')[0],
        exercises: [],
        error: error || '保存失败'
      },
      actions: [
        { id: 'retry', label: '重试', action: 'retry' },
        { id: 'dismiss', label: '关闭', action: 'dismiss' }
      ]
    }
  }

  const exerciseSummary = exercises.map(
    e => `${e.name} ${e.sets}组`
  ).join('、')

  const volumeText = totalVolume ? `总容量 ${totalVolume}kg` : ''
  const durationText = duration ? `时长 ${Math.round(duration / 60)}分钟` : ''

  return {
    type: 'card',
    cardType: 'training-editable',
    cardData: {
      date: new Date().toISOString().split('T')[0],
      exercises: exercises.map(e => ({
        name: e.name,
        sets: e.sets,
        totalVolume: e.totalVolume
      })),
      trainingId: result.trainingId,
      totalVolume,
      duration,
      saved: true,
      summary: `${exerciseSummary}${volumeText ? '，' + volumeText : ''}${durationText ? '，' + durationText : ''}`
    },
    actions: [
      { id: 'viewDetail', label: '查看详情', action: 'navigate', target: '/pages/training/history' },
      { id: 'viewPR', label: '查看PR', action: 'navigate', target: '/pages/pr' },
      { id: 'dismiss', label: '关闭', action: 'dismiss' }
    ]
  }
}
