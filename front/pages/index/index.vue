<template>
  <view class="container">
    <!-- 快捷操作栏 -->
    <view class="quick-actions">
      <view class="action-btn" @click="navigateTo('/pages/data/weight')">
        <text class="action-icon">📊</text>
        <text class="action-text">记体重</text>
      </view>
      <view class="action-btn" @click="navigateTo('/pages/training/today')">
        <text class="action-icon">💪</text>
        <text class="action-text">记训练</text>
      </view>
      <view class="action-btn" @click="navigateTo('/pages/data/measurements')">
        <text class="action-icon">📏</text>
        <text class="action-text">记围度</text>
      </view>
      <view class="action-btn" @click="focusInput">
        <text class="action-icon">❓</text>
        <text class="action-text">问教练</text>
      </view>
      <view class="action-btn action-btn-primary" @click="handleRecommendTraining">
        <text class="action-icon">🎯</text>
        <text class="action-text">练什么</text>
      </view>
    </view>

    <!-- 推荐结果卡片 -->
    <view v-if="recommendation" class="recommendation-card">
      <view class="card-header">
        <text class="ai-avatar">🤖</text>
        <text class="ai-name">AI己</text>
      </view>
      <view class="card-body">
        <!-- need_goal 类型 -->
        <template v-if="recommendation.type === 'need_goal'">
          <text class="recommend-title">{{ recommendation.message }}</text>
          <view class="option-buttons">
            <button
              v-for="option in recommendation.options"
              :key="option"
              class="option-btn"
              @click="handleGoalSelect(option)"
            >
              {{ option }}
            </button>
          </view>
        </template>

        <!-- completed_today 类型 -->
        <template v-else-if="recommendation.type === 'completed_today'">
          <text class="recommend-title">{{ recommendation.message }}</text>
          <view class="completed-info">
            <text>已完成：{{ recommendation.completedTraining?.name }}</text>
            <text>时长：{{ recommendation.completedTraining?.duration }}分钟</text>
          </view>
          <view class="option-buttons">
            <button
              v-for="option in recommendation.options"
              :key="option"
              class="option-btn"
              @click="handleSuggestionSelect(option)"
            >
              {{ option }}
            </button>
          </view>
        </template>

        <!-- rest_day 类型 -->
        <template v-else-if="recommendation.type === 'rest_day'">
          <text class="recommend-title">{{ recommendation.message }}</text>
          <view class="option-buttons">
            <button
              v-for="option in recommendation.options"
              :key="option"
              class="option-btn"
              @click="handleSuggestionSelect(option)"
            >
              {{ option }}
            </button>
          </view>
        </template>

        <!-- new_recommendation / overtraining_warning 类型 -->
        <template v-else-if="recommendation.type === 'new_recommendation' || recommendation.type === 'overtraining_warning'">
          <text class="recommend-title">「根据你的目标，今天推荐练：{{ recommendation.training?.targetMuscle }}」</text>

          <!-- 过度训练预警 -->
          <view v-if="recommendation.warnings?.length" class="warning-box">
            <text class="warning-icon">⚠️</text>
            <text class="warning-text">{{ recommendation.warnings[0] }}</text>
          </view>

          <!-- 恢复分数 -->
          <view v-if="recommendation.overallScore" class="recovery-score">
            <text class="score-label">整体恢复：</text>
            <view class="score-bar">
              <view
                class="score-fill"
                :style="{ width: recommendation.overallScore + '%' }"
                :class="getScoreClass(recommendation.overallScore)"
              />
            </view>
            <text class="score-value">{{ recommendation.overallScore }}</text>
          </view>

          <view class="training-preview">
            <view class="training-info">
              <text class="training-name">📋 {{ recommendation.training?.name }}</text>
              <text class="training-meta">⏱️ 预计时长：{{ recommendation.training?.duration }}分钟</text>
              <text class="training-meta">💪 训练类型：{{ recommendation.training?.type }}</text>
            </view>
            <view class="exercise-list">
              <text class="exercise-list-title">📝 动作预览：</text>
              <text
                v-for="(ex, idx) in recommendation.training?.exercises"
                :key="idx"
                class="exercise-item"
              >
                • {{ ex.name }} {{ ex.sets }}×{{ ex.reps }}
              </text>
            </view>
            <view class="reason">
              <text class="reason-title">💡 为什么推荐：</text>
              <text class="reason-text">{{ recommendation.training?.reason }}</text>
            </view>
          </view>
          <view class="action-buttons">
            <button class="btn-primary" @click="handleStartTraining">开始训练</button>
            <button class="btn-secondary" @click="handleRefreshRecommend">换一个</button>
            <button class="btn-link" @click="navigateTo('/pages/training/plan-list')">查看计划</button>
          </view>
          <view class="quick-mode-btn">
            <button class="btn-quick" @click="handleQuickMode">⚡ 快速训练（20分钟）</button>
          </view>
        </template>
      </view>
    </view>

    <!-- AI 对话区域 -->
        <view v-if="chatStore.greeting" class="greeting-card">
          <view class="card-header">
            <text class="ai-avatar">🤖</text>
            <text class="ai-name">AI己</text>
          </view>
          <view class="card-body">
            <template v-if="chatStore.greeting.type === 'text'">
              <MarkdownRenderer :content="chatStore.greeting.content" />
            </template>
            <template v-else-if="chatStore.greeting.type === 'card'">
              <text class="greeting-text">{{ chatStore.greeting.cardData?.summary || '今天要加油哦！' }}</text>
              <view v-if="chatStore.greeting.actions" class="card-actions">
                <button
                  v-for="action in chatStore.greeting.actions"
                  :key="action.id"
                  class="action-btn"
                  @click="handleGreetingAction(action)"
                >
                  {{ action.label }}
                </button>
              </view>
            </template>
          </view>
        </view>

        <!-- 消息列表 -->
        <view
          v-for="msg in allMessages"
          :key="msg.id"
          class="message-item"
          :class="msg.role"
        >
          <!-- 用户消息 -->
          <view v-if="msg.role === 'user'" class="message-content user">
            <view class="message-bubble user-bubble">
              <text>{{ msg.content }}</text>
            </view>
          </view>

          <!-- AI 消息 - 思考中 -->
          <view v-else-if="msg.type === 'thinking'" class="message-content ai">
            <text class="ai-avatar-sm">🤖</text>
            <view class="message-bubble thinking-bubble">
              <text class="thinking-text">🤔 思考中...</text>
            </view>
          </view>

          <!-- AI 消息 - 文本 -->
          <view v-else-if="msg.type === 'text'" class="message-content ai">
            <text class="ai-avatar-sm">🤖</text>
            <view class="message-bubble">
              <MarkdownRenderer :content="msg.content" />
            </view>
          </view>

          <!-- AI 消息 - 卡片 -->
          <view v-else-if="msg.type === 'card'" class="message-content ai">
            <text class="ai-avatar-sm">🤖</text>
            <view class="message-bubble card-bubble">
              <card-component
                :card-type="msg.cardType"
                :card-data="msg.cardData"
                :actions="msg.actions"
                :disabled="chatStore.processingMessageId === msg.id"
                @action="handleCardAction(msg.id, $event)"
              />
            </view>
          </view>
        </view>

    <!-- 固定在底部的聊天输入框 -->
    <view class="fixed-chat-input">
      <input
        v-model="chatInput"
        class="chat-input"
        placeholder="我是你的健身小秘书，什么都可以跟我说哦。"
        confirm-type="send"
        @confirm="handleChatSubmit"
      />
      <button class="send-btn" @click="handleChatSubmit">发送</button>
    </view>

    <!-- 目标选择弹窗 -->
    <view v-if="showGoalModal" class="modal-mask" @click="showGoalModal = false">
      <view class="modal-content" @click.stop>
        <text class="modal-title">选择你的健身目标</text>
        <view class="goal-options">
          <button
            v-for="goal in goalOptions"
            :key="goal.value"
            class="goal-btn"
            @click="confirmGoal(goal.value)"
          >
            {{ goal.label }}
          </button>
        </view>
      </view>
    </view>

    <!-- 首次引导弹窗 -->
    <view v-if="showOnboardingPrompt" class="modal-mask" @click="dismissOnboardingPrompt">
      <view class="modal-content onboarding-modal" @click.stop>
        <text class="onboarding-icon">🏋️</text>
        <text class="onboarding-title">欢迎使用 AI己</text>
        <text class="onboarding-desc">完成简单的初始化问卷，获取专属训练计划</text>
        <view class="onboarding-actions">
          <button class="onboarding-btn primary" @click="startOnboarding">开始初始化</button>
          <button class="onboarding-btn secondary" @click="dismissOnboardingPrompt">稍后再说</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, nextTick } from 'vue'
import { recommendTraining, type RecommendResponse } from '@/api/training'
import { useUserStore } from '@/stores/user'
import { useChatStore } from '@/stores/chat'
import { getOnboardingStatus } from '@/api/onboarding'
import CardComponent from '@/components/chat/cards/CardComponent.vue'
import MarkdownRenderer from '../../components/MarkdownRenderer.vue'

const userStore = useUserStore()
const chatStore = useChatStore()

// 推荐结果
const recommendation = ref<RecommendResponse | null>(null)
const showGoalModal = ref(false)
const pendingGoalOption = ref<string>('')

// 聊天相关
const chatInput = ref('')
const chatInputRef = ref<any>(null)
const chatAreaRef = ref<any>(null)
const chatScrollTop = ref(0)
const thinkingMessageId = ref<string | null>(null)

// 合并问候语和消息列表
const allMessages = computed(() => chatStore.messages)

// 首次引导相关
const showOnboardingPrompt = ref(false)
const onboardingDismissed = ref(false)

onMounted(async () => {
  // 初始化聊天
  await chatStore.initialize()

  // 检查是否需要显示引导弹窗
  checkOnboardingPrompt()
})

// 目标选项
const goalOptions = [
  { label: '减脂', value: 'LOSE_FAT' },
  { label: '增肌', value: 'GAIN_MUSCLE' },
  { label: '塑形', value: 'BODY_SHAPE' },
  { label: '提升体能', value: 'IMPROVE_FITNESS' },
]

function navigateTo(url: string) {
  uni.navigateTo({ url })
}

function focusInput() {
  chatInputRef.value?.focus()
}

async function handleChatSubmit() {
  const content = chatInput.value.trim()
  if (!content || chatStore.isLoading) return

  chatInput.value = ''

  // 发送消息（内部会先显示用户消息和"思考中"）
  await chatStore.sendMessage(content)

  // 滚动到底部
  await nextTick()
  scrollToBottom()
}

function scrollToBottom() {
  if (chatAreaRef.value) {
    chatAreaRef.value.scrollTop = chatAreaRef.value.scrollHeight + 1000
  }
}

async function handleCardAction(messageId: string, actionId: string) {
  await chatStore.handleCardAction(messageId, actionId)
}

function handleGreetingAction(action: { id: string; label: string; action: string; target?: string }) {
  switch (action.action) {
    case 'navigate':
      if (action.target) {
        uni.navigateTo({ url: action.target })
      }
      break
    case 'dismiss':
      // 关闭问候卡片
      chatStore.greeting = null
      break
    case 'start':
      if (action.target) {
        uni.navigateTo({ url: action.target })
      }
      break
    case 'confirm':
      // 确认
      break
    default:
      uni.showToast({ title: action.label, icon: 'none' })
  }
}

async function handleRecommendTraining() {
  uni.showLoading({ title: '分析中...' })
  try {
    recommendation.value = await recommendTraining()
  } catch (e) {
    console.error('推荐失败', e)
    uni.showToast({ title: '推荐失败，请重试', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

function handleGoalSelect(option: string) {
  pendingGoalOption.value = option
  showGoalModal.value = true
}

async function confirmGoal(goal: string) {
  showGoalModal.value = false
  uni.showToast({ title: `目标已设置：${pendingGoalOption.value}`, icon: 'none' })
  // 更新用户目标后重新请求推荐
  await handleRecommendTraining()
}

function handleSuggestionSelect(option: string) {
  switch (option) {
    case '安排拉伸':
      uni.showToast({ title: '拉伸计划（Phase 2）', icon: 'none' })
      break
    case '轻度有氧':
      uni.showToast({ title: '有氧训练（Phase 2）', icon: 'none' })
      break
    case '查看周报':
      uni.showToast({ title: '周报（Phase 2）', icon: 'none' })
      break
    default:
      uni.showToast({ title: option, icon: 'none' })
  }
}

function handleStartTraining() {
  if (recommendation.value?.training) {
    // 传递推荐数据到今日训练页面
    const trainingData = encodeURIComponent(JSON.stringify(recommendation.value.training))
    navigateTo(`/pages/training/today?training=${trainingData}`)
  } else {
    navigateTo('/pages/training/today')
  }
}

async function handleRefreshRecommend() {
  recommendation.value = null
  uni.showLoading({ title: '重新推荐...' })
  try {
    recommendation.value = await recommendTraining(true)
  } catch (e) {
    console.error('推荐失败', e)
    uni.showToast({ title: '推荐失败，请重试', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

async function handleQuickMode() {
  uni.showLoading({ title: '生成快速训练...' })
  try {
    recommendation.value = await recommendTraining(false, true)
  } catch (e) {
    console.error('推荐失败', e)
    uni.showToast({ title: '推荐失败，请重试', icon: 'none' })
  } finally {
    uni.hideLoading()
  }
}

function getScoreClass(score: number): string {
  if (score >= 75) return 'score-good'
  if (score >= 50) return 'score-warning'
  return 'score-danger'
}

// 首次引导相关
async function checkOnboardingPrompt() {
  // 如果已经弹过或者显示过，就不再弹
  if (onboardingDismissed.value) return

  try {
    const status = await getOnboardingStatus()
    if (!status.hasCompletedOnboarding) {
      // 未完成引导，显示弹窗
      showOnboardingPrompt.value = true
    }
  } catch (e) {
    // 如果出错，不显示弹窗
    console.error('检查引导状态失败', e)
  }
}

function dismissOnboardingPrompt() {
  showOnboardingPrompt.value = false
  onboardingDismissed.value = true
}

function startOnboarding() {
  showOnboardingPrompt.value = false
  uni.navigateTo({ url: '/pages/onboarding/index' })
}
</script>

<style lang="scss" scoped>
.container {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 20rpx;
  padding-bottom: 120rpx;
  padding-top:100rpx;
}

/* 快捷操作栏 */
.quick-actions {
  display: flex-box;
  justify-content: space-between;
  padding: 20rpx;
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 20rpx;
  position: fixed;
  top: 0;
  width:100vw;
}

.action-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 120rpx;
  padding: 16rpx 8rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  cursor: pointer;
}

.action-btn-primary {
  background: linear-gradient(135deg, #07c160, #06ad56);
  color: #fff;
}

.action-icon {
  font-size: 36rpx;
  margin-bottom: 6rpx;
}

.action-text {
  font-size: 22rpx;
  color: #666;
}

.action-btn-primary .action-text {
  color: #fff;
}

/* 推荐卡片 */
.recommendation-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 1rpx solid #eee;
}

.ai-avatar {
  font-size: 40rpx;
  margin-right: 12rpx;
}

.ai-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.card-body {
  font-size: 28rpx;
}

.recommend-title {
  display: block;
  margin-bottom: 20rpx;
  font-size: 30rpx;
  color: #333;
}

/* 选项按钮 */
.option-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.option-btn {
  padding: 16rpx 32rpx;
  background: #f0f0f0;
  border-radius: 32rpx;
  font-size: 26rpx;
  color: #333;
  border: none;
}

/* 完成信息 */
.completed-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 20rpx;
  color: #666;
  font-size: 26rpx;
}

/* 训练预览 */
.training-preview {
  background: #f8f8f8;
  border-radius: 12rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
}

.training-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.training-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.training-meta {
  font-size: 24rpx;
  color: #666;
}

.exercise-list {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  margin-bottom: 16rpx;
}

.exercise-list-title {
  font-size: 26rpx;
  color: #333;
  margin-bottom: 8rpx;
}

.exercise-item {
  font-size: 24rpx;
  color: #666;
  line-height: 1.6;
}

.reason {
  border-top: 1rpx solid #eee;
  padding-top: 16rpx;
}

.reason-title {
  font-size: 26rpx;
  color: #333;
}

.reason-text {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-top: 4rpx;
}

/* 操作按钮 */
.action-buttons {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.btn-primary {
  flex: 1;
  padding: 20rpx;
  background: linear-gradient(135deg, #07c160, #06ad56);
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
  border: none;
}

.btn-secondary {
  flex: 1;
  padding: 20rpx;
  background: #fff;
  color: #333;
  border-radius: 40rpx;
  font-size: 28rpx;
  border: 1rpx solid #ddd;
}

.btn-link {
  padding: 20rpx;
  background: transparent;
  color: #07c160;
  font-size: 28rpx;
  border: none;
}

/* 预警框 */
.warning-box {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 16rpx 20rpx;
  background: #fff3e0;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
}

.warning-icon {
  font-size: 32rpx;
}

.warning-text {
  font-size: 26rpx;
  color: #e65100;
}

/* 恢复分数 */
.recovery-score {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.score-label {
  font-size: 24rpx;
  color: #666;
}

.score-bar {
  flex: 1;
  height: 16rpx;
  background: #f0f0f0;
  border-radius: 8rpx;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 8rpx;
  transition: width 0.3s;
}

.score-good {
  background: linear-gradient(90deg, #07c160, #06ad56);
}

.score-warning {
  background: linear-gradient(90deg, #ff9800, #f57c00);
}

.score-danger {
  background: linear-gradient(90deg, #f56c6c, #e53935);
}

.score-value {
  font-size: 24rpx;
  color: #333;
  font-weight: 600;
  min-width: 40rpx;
}

/* 快速训练按钮 */
.quick-mode-btn {
  margin-top: 16rpx;
}

.btn-quick {
  width: 100%;
  padding: 16rpx;
  background: #fff;
  color: #ff9800;
  font-size: 26rpx;
  border-radius: 32rpx;
  border: 2rpx dashed #ff9800;
}

/* 对话区域 */
.chat-area {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  min-height: 400rpx;
  flex:1;
  // display: flex;
  // flex-direction: column;
}

.chat-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 300rpx;
  color: #ccc;
  font-size: 28rpx;
}

/* 问候卡片 */
.greeting-card {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  color: #fff;
}

.greeting-card .card-header {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid rgba(255, 255, 255, 0.3);
}

.greeting-card .ai-avatar {
  font-size: 36rpx;
  margin-right: 12rpx;
}

.greeting-card .ai-name {
  font-size: 28rpx;
  font-weight: 600;
}

.greeting-card .card-body {
  font-size: 28rpx;
}

.greeting-text {
  display: block;
  line-height: 1.6;
}

.greeting-card .card-actions {
  display: flex;
  gap: 12rpx;
  margin-top: 16rpx;
}

.greeting-card .action-btn {
  flex: 1;
  padding: 12rpx 16rpx;
  background: rgba(255, 255, 255, 0.2);
  border: 1rpx solid rgba(255, 255, 255, 0.3);
  border-radius: 24rpx;
  color: #fff;
  font-size: 24rpx;
}

/* 消息列表 */
.chat-messages {
  flex: 1;
  max-height: 500rpx;
  overflow-y: auto;
  margin-bottom: 20rpx;
}

.message-item {
  display: flex;
  margin-bottom: 20rpx;
}

.message-item.user {
  justify-content: flex-end;
}

.message-item.ai {
  justify-content: flex-start;
}

.message-content {
  max-width: 80%;
  display: flex;
  align-items: flex-start;
}

.message-content.user .message-bubble {
  background: #07c160;
  color: #fff;
  border-radius: 24rpx 24rpx 4rpx 24rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  line-height: 1.4;
}

.message-content.ai .message-bubble {
  background: #f0f0f0;
  color: #333;
  border-radius: 24rpx 24rpx 24rpx 4rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  line-height: 1.4;
}

.ai-avatar-sm {
  font-size: 32rpx;
  margin-right: 8rpx;
  flex-shrink: 0;
}

.card-bubble {
  padding: 0;
  overflow: hidden;
}

.thinking-bubble {
  background: #f0f0f0 !important;
}

.thinking-text {
  color: #999;
  font-style: italic;
}

/* 聊天输入 */
.chat-input-area {
  display: flex;
  gap: 12rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #eee;
}

/* 固定在底部的聊天输入框 */
.fixed-chat-input {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx;
  /* #ifdef H5 */
  padding-bottom: calc(20rpx + env(safe-area-inset-bottom));
  /* #endif */
  background: #fff;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.chat-input {
  flex: 1;
  height: 80rpx;
  padding: 0 24rpx;
  background: #f5f5f5;
  border-radius: 40rpx;
  font-size: 28rpx;
  line-height: 80rpx;
}

.send-btn {
  height: 80rpx;
  padding: 0 32rpx;
  background: #07c160;
  color: #fff;
  border-radius: 40rpx;
  font-size: 28rpx;
  border: none;
  line-height: 80rpx;
}

/* 快捷聊天按钮 */
.chat-quick-btns {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
  padding-top: 16rpx;
}

.quick-btn {
  padding: 12rpx 24rpx;
  background: #f0f0f0;
  border-radius: 24rpx;
  font-size: 24rpx;
  color: #333;
  border: none;
}

/* 目标选择弹窗 */
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-content {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx;
  width: 80%;
  max-width: 600rpx;
}

.modal-title {
  display: block;
  text-align: center;
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 32rpx;
  color: #333;
}

.goal-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx;
}

.goal-btn {
  padding: 24rpx;
  background: #f0f0f0;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #333;
  border: none;
}

/* 首次引导弹窗 */
.onboarding-modal {
  text-align: center;
  padding: 60rpx 40rpx;
}

.onboarding-icon {
  font-size: 100rpx;
  display: block;
  margin-bottom: 32rpx;
}

.onboarding-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.onboarding-desc {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 48rpx;
  line-height: 1.5;
}

.onboarding-actions {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.onboarding-btn {
  height: 96rpx;
  line-height: 96rpx;
  border-radius: 48rpx;
  font-size: 32rpx;
  font-weight: bold;
  border: none;
}

.onboarding-btn.primary {
  background: linear-gradient(135deg, #07c160, #06ad56);
  color: #fff;
}

.onboarding-btn.secondary {
  background: #f5f5f5;
  color: #666;
}
</style>