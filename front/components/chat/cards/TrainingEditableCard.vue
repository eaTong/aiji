<template>
  <view class="training-editable-card">
    <view class="training-header">
      <text class="card-title">💪 训练记录</text>
      <view class="header-right">
        <text class="training-date">{{ cardData.date }}</text>
        <text v-if="cardData.saved" class="saved-badge">已保存</text>
      </view>
    </view>

    <view v-if="cardData.summary" class="training-summary">
      {{ cardData.summary }}
    </view>

    <view v-if="cardData.error" class="card-error">
      <text>{{ cardData.error }}</text>
    </view>

    <view v-if="cardData.exercises?.length" class="exercise-list">
      <view
        v-for="(ex, idx) in cardData.exercises"
        :key="idx"
        class="exercise-item"
      >
        <view class="exercise-info">
          <text class="ex-name">{{ ex.name }}</text>
          <text class="ex-sets">{{ ex.sets }}组</text>
        </view>
        <text v-if="ex.totalVolume" class="ex-volume">{{ ex.totalVolume }}kg</text>
      </view>
    </view>

    <view v-if="cardData.totalVolume" class="training-volume">
      总容量: {{ cardData.totalVolume }}kg
    </view>

    <view v-if="cardData.duration" class="training-duration">
      时长: {{ formatDuration(cardData.duration) }}
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
import type { TrainingEditableCardData } from './types'

defineProps<{
  cardData: TrainingEditableCardData
  actions?: Array<{ id: string; label: string; action: string; target?: string }>
  disabled?: boolean
}>()

const emit = defineEmits<{
  action: [actionId: string]
}>()

function formatDuration(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}秒`
  }
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) {
    return `${minutes}分钟`
  }
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}小时${remainingMinutes}分钟`
}
</script>

<style lang="scss" scoped>
.training-editable-card {
  padding: 16rpx;
}

.training-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12rpx;
}

.header-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4rpx;
}

.card-title {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

.training-date {
  font-size: 24rpx;
  color: #666;
}

.saved-badge {
  font-size: 22rpx;
  color: #07c160;
  background: #e8f8f0;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}

.training-summary {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 12rpx;
  padding: 12rpx 16rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
}

.exercise-list {
  margin-top: 8rpx;
}

.exercise-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.exercise-item:last-child {
  border-bottom: none;
}

.exercise-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.ex-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.ex-sets {
  font-size: 24rpx;
  color: #07c160;
}

.ex-volume {
  font-size: 24rpx;
  color: #666;
}

.training-volume {
  margin-top: 12rpx;
  font-size: 24rpx;
  color: #07c160;
}

.training-duration {
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #666;
}

.card-error {
  color: #e53935;
  font-size: 24rpx;
  text-align: center;
  margin-bottom: 12rpx;
  padding: 12rpx;
  background: #ffebee;
  border-radius: 8rpx;
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
