import { defineStore } from 'pinia'
import { ref } from 'vue'
import * as chatApi from '@/api/chat'
import type {
  AIMessage,
  GreetingResponse,
  UnreadPush,
  SendMessageResponse,
  ConfirmSaveResponse
} from '@/api/chat'

// ============================================
// Chat Store - 聊天状态管理
// ============================================

export const useChatStore = defineStore('chat', () => {
  // 状态
  const messages = ref<AIMessage[]>([])
  const greeting = ref<GreetingResponse | null>(null)
  const unreadPushes = ref<UnreadPush[]>([])
  const isLoading = ref(false)
  const isInitialized = ref(false)
  const currentSessionId = ref<string | null>(null)
  const lastMessageTime = ref<string | null>(null)

  // 待确认的卡片数据（用于确认流程）
  const pendingConfirmCard = ref<{
    cardId: string
    cardType: string
    cardData: Record<string, any>
    intent: string
    entities: Record<string, any>
  } | null>(null)

  // 初始化聊天（获取问候语和未读推送）
  async function initialize() {
    if (isInitialized.value) return

    isLoading.value = true
    try {
      const res = await chatApi.getChatInit()
      greeting.value = res.greeting
      unreadPushes.value = res.unreadPushes

      // 标记推送已读
      for (const push of res.unreadPushes) {
        await chatApi.markPushRead(push.id)
      }

      isInitialized.value = true
    } catch (e) {
      console.error('初始化聊天失败', e)
    } finally {
      isLoading.value = false
    }
  }

  // 加载消息列表
  async function loadMessages() {
    try {
      const since = lastMessageTime.value
      const res = await chatApi.getMessages(since)
      // 将新消息添加到列表
      messages.value = [...messages.value, ...res.messages.reverse()]
      if (res.messages.length > 0) {
        lastMessageTime.value = res.messages[0].createdAt
      }
    } catch (e) {
      console.error('加载消息失败', e)
    }
  }

  // 发送消息
  async function sendMessage(content: string): Promise<SendMessageResponse | null> {
    if (!content.trim()) return null

    isLoading.value = true
    try {
      const res = await chatApi.sendMessage(content, undefined, currentSessionId.value || undefined)

      // 添加用户消息
      messages.value.push(res.message)

      // 添加 AI 消息
      messages.value.push(res.aiMessage)

      // 更新会话ID
      if (res.aiMessage.sessionId) {
        currentSessionId.value = res.aiMessage.sessionId
      }

      // 检查是否是待确认的卡片
      if (res.aiMessage.type === 'card' && res.aiMessage.cardType) {
        pendingConfirmCard.value = {
          cardId: res.aiMessage.id,
          cardType: res.aiMessage.cardType,
          cardData: res.aiMessage.cardData || {},
          intent: res.intent || '',
          entities: res.entities || {}
        }
      }

      return res
    } catch (e) {
      console.error('发送消息失败', e)
      uni.showToast({ title: '发送失败，请重试', icon: 'none' })
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 确认并保存记录
  async function confirmAndSave(confirmed: boolean): Promise<ConfirmSaveResponse | null> {
    if (!pendingConfirmCard.value) return null

    isLoading.value = true
    try {
      const res = await chatApi.confirmSave({
        cardId: pendingConfirmCard.value.cardId,
        cardType: pendingConfirmCard.value.cardType,
        cardData: pendingConfirmCard.value.cardData,
        confirmed
      })

      if (res.saved) {
        // 添加确认成功的 AI 消息
        if (res.achievementMessage) {
          messages.value.push(res.achievementMessage)
        }
        uni.showToast({ title: confirmed ? '保存成功' : '已取消', icon: 'success' })
      } else if (res.error) {
        uni.showToast({ title: res.error, icon: 'none' })
      }

      // 清除待确认卡片
      pendingConfirmCard.value = null

      return res
    } catch (e) {
      console.error('确认保存失败', e)
      uni.showToast({ title: '保存失败', icon: 'none' })
      return null
    } finally {
      isLoading.value = false
    }
  }

  // 处理卡片按钮点击
  async function handleCardAction(
    messageId: string,
    actionId: string
  ) {
    // 查找对应的消息
    const message = messages.value.find(m => m.id === messageId)
    if (!message || !message.actions) return

    // 查找对应的动作
    const action = message.actions.find(a => a.id === actionId)
    if (!action) return

    // 根据 action 类型处理
    switch (action.action) {
      case 'navigate':
        // 跳转页面
        if (action.target) {
          uni.navigateTo({ url: action.target })
        }
        break

      case 'dismiss':
        // 关闭卡片 - 从消息列表移除
        messages.value = messages.value.filter(m => m.id !== messageId)
        break

      case 'confirm':
        // 确认保存
        await confirmAndSave(true)
        break

      case 'cancel':
        // 取消
        await confirmAndSave(false)
        break

      case 'regenerate':
        // 重新生成 - 重新发送消息
        if (message.content) {
          await sendMessage(message.content)
        }
        // 移除旧卡片
        messages.value = messages.value.filter(m => m.id !== messageId)
        break

      case 'edit':
        // 编辑 - 跳转到编辑页面
        if (action.target) {
          uni.navigateTo({ url: action.target })
        }
        break

      case 'share':
        // 分享
        uni.showShareMenu({
          withShareTicket: true
        })
        break

      case 'callback':
        // 自定义回调
        if (action.target) {
          // 执行自定义逻辑
          console.log('callback', action.target)
        }
        break

      default:
        console.warn('未知 action 类型:', action.action)
    }
  }

  // 快捷按钮发送
  async function quickSend(content: string) {
    return await sendMessage(content)
  }

  // 清除会话
  async function clearSession() {
    try {
      await chatApi.clearSession()
      currentSessionId.value = null
      pendingConfirmCard.value = null
      messages.value = []
      lastMessageTime.value = null
    } catch (e) {
      console.error('清除会话失败', e)
    }
  }

  // 重置状态
  function reset() {
    messages.value = []
    greeting.value = null
    unreadPushes.value = []
    isLoading.value = false
    isInitialized.value = false
    currentSessionId.value = null
    lastMessageTime.value = null
    pendingConfirmCard.value = null
  }

  return {
    // 状态
    messages,
    greeting,
    unreadPushes,
    isLoading,
    isInitialized,
    currentSessionId,
    pendingConfirmCard,

    // 方法
    initialize,
    loadMessages,
    sendMessage,
    confirmAndSave,
    handleCardAction,
    quickSend,
    clearSession,
    reset
  }
})
