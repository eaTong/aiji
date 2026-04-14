import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as chatApi from '@/api/chat'
import type { UnreadPush } from '@/api/chat'

// ============================================
// Push Store - 推送状态管理
// ============================================

export const usePushStore = defineStore('push', () => {
  // 状态
  const unreadPushes = ref<UnreadPush[]>([])
  const isLoading = ref(false)

  // 获取未读推送
  async function fetchUnreadPushes() {
    isLoading.value = true
    try {
      const res = await chatApi.getUnreadPushes()
      unreadPushes.value = res.pushes
    } catch (e) {
      console.error('获取未读推送失败', e)
    } finally {
      isLoading.value = false
    }
  }

  // 标记推送已读
  async function markAsRead(pushId: string) {
    try {
      await chatApi.markPushRead(pushId)
      unreadPushes.value = unreadPushes.value.filter(p => p.id !== pushId)
    } catch (e) {
      console.error('标记已读失败', e)
    }
  }

  // 添加推送（用于主动推送）
  function addPush(push: UnreadPush) {
    // 检查是否已存在
    const exists = unreadPushes.value.some(p => p.id === push.id)
    if (!exists) {
      unreadPushes.value.unshift(push)
    }
  }

  // 清除所有推送
  function clearAll() {
    unreadPushes.value = []
  }

  return {
    // 状态
    unreadPushes,
    isLoading,
    // 方法
    fetchUnreadPushes,
    markAsRead,
    addPush,
    clearAll
  }
})
