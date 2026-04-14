<template>
  <view class="achievement-card">
    <view class="achievement-header">
      <text class="card-title">🏆 成就解锁</text>
    </view>

    <view class="achievement-content">
      <text class="achievement-icon">{{ displayIcon }}</text>
      <text class="achievement-name">{{ displayName }}</text>
      <text class="achievement-desc">{{ displayDescription }}</text>
      <text class="achievement-date">{{ displayDate }}</text>
    </view>

    <view v-if="cardData.progress" class="achievement-progress">
      <view class="progress-bar">
        <view
          class="progress-fill"
          :style="{ width: progressPercent + '%' }"
        />
      </view>
      <text class="progress-text">
        {{ cardData.progress.current }} / {{ cardData.progress.target }}
      </text>
    </view>

    <!-- 卡片动作按钮 -->
    <view v-if="actions?.length" class="card-actions">
      <button
        v-for="action in actions"
        :key="action.id"
        class="card-action-btn"
        :class="action.action"
        :disabled="disabled"
        @click="emit('action', action.id)"
      >
        {{ action.label }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { AchievementCardData } from './types'

const props = defineProps<{
  cardData: AchievementCardData
  actions?: Array<{ id: string; label: string; action: string; target?: string }>
  disabled?: boolean
}>()

const emit = defineEmits<{
  action: [actionId: string]
}>()

const achievement = computed(() => props.cardData.achievement || props.cardData)

const displayIcon = computed(() => {
  return achievement.value.icon || props.cardData.icon || '🏆'
})

const displayName = computed(() => {
  return achievement.value.name || props.cardData.name || '成就'
})

const displayDescription = computed(() => {
  return achievement.value.description || props.cardData.description || ''
})

const displayDate = computed(() => {
  const date = achievement.value.unlockedAt || props.cardData.unlockedAt || ''
  if (!date) return ''
  return date.split('T')[0]
})

const progressPercent = computed(() => {
  if (!props.cardData.progress) return 0
  const { current, target } = props.cardData.progress
  if (!target) return 0
  return Math.min(100, Math.round((current / target) * 100))
})
</script>

<style lang="scss" scoped>
.achievement-card {
  padding: 24rpx;
  text-align: center;
}

.achievement-header {
  margin-bottom: 16rpx;
}

.card-title {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

.achievement-content {
  margin-bottom: 16rpx;
}

.achievement-icon {
  font-size: 80rpx;
  display: block;
  margin-bottom: 12rpx;
}

.achievement-name {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.achievement-desc {
  display: block;
  font-size: 26rpx;
  color: #666;
  margin-bottom: 8rpx;
  line-height: 1.5;
}

.achievement-date {
  display: block;
  font-size: 22rpx;
  color: #999;
}

.achievement-progress {
  margin-top: 16rpx;
}

.progress-bar {
  height: 16rpx;
  background: #eee;
  border-radius: 8rpx;
  margin-bottom: 8rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #07c160, #06ad56);
  border-radius: 8rpx;
  transition: width 0.3s;
}

.progress-text {
  font-size: 24rpx;
  color: #666;
}

/* 卡片动作按钮 */
.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.card-action-btn {
  flex: 1;
  min-width: 200rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 26rpx;
  border-radius: 36rpx;
  border: none;
  background: #f5f5f5;
  color: #666;
}

.card-action-btn[disabled] {
  opacity: 0.5;
}
</style>
