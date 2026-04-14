import * as pushService from '../services/pushService'
import * as sessionManager from '../services/sessionManager'

// ============================================
// 定时任务 - 推送检查与清理
// ============================================

let isRunning = false

/**
 * 执行定时任务
 */
export async function runScheduledTasks(): Promise<void> {
  if (isRunning) {
    console.log('[PushChecker] Task already running, skipping...')
    return
  }

  isRunning = true
  const startTime = Date.now()

  try {
    console.log('[PushChecker] Running scheduled tasks...')

    // 1. 检查定时推送
    await pushService.checkScheduledPushes()
    console.log('[PushChecker] Scheduled pushes checked')

    // 2. 清理过期推送
    await pushService.cleanupExpiredPushes()
    console.log('[PushChecker] Expired pushes cleaned')

    // 3. 清理过期 Session
    await sessionManager.cleanupExpiredSessions()
    console.log('[PushChecker] Expired sessions cleaned')

    console.log(`[PushChecker] All tasks completed in ${Date.now() - startTime}ms`)
  } catch (error) {
    console.error('[PushChecker] Error running tasks:', error)
  } finally {
    isRunning = false
  }
}

/**
 * 启动定时任务（每分钟执行）
 */
export function startPushChecker(): NodeJS.Timeout {
  // 立即执行一次
  runScheduledTasks()

  // 每分钟执行
  const interval = setInterval(runScheduledTasks, 60 * 1000)

  console.log('[PushChecker] Push checker started (every 60 seconds)')

  return interval
}

/**
 * 停止定时任务
 */
export function stopPushChecker(interval: NodeJS.Timeout): void {
  clearInterval(interval)
  console.log('[PushChecker] Push checker stopped')
}
