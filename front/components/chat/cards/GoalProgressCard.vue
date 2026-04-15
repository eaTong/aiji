<template>
  <view class="goal-progress-card">
    <!-- 无目标状态 -->
    <template v-if="cardData.message">
      <view class="empty-state">
        <text class="empty-icon">🎯</text>
        <text class="empty-text">{{ cardData.message }}</text>
      </view>
    </template>

    <!-- 有目标状态 -->
    <template v-else>
      <view class="card-header">
        <text class="card-icon">🎯</text>
        <text class="card-title">目标进度</text>
      </view>

      <!-- 目标类型 -->
      <view class="goal-type">
        <text class="type-label">{{ goalLabel }}</text>
      </view>

      <!-- 进度条 -->
      <view class="progress-section">
        <view class="progress-bar">
          <view
            class="progress-fill"
            :style="{ width: Math.min(cardData.progress || 0, 100) + '%' }"
          />
        </view>
        <view class="progress-numbers">
          <text class="current">{{ cardData.goal?.current || cardData.current || 0 }}</text>
          <text class="separator">/</text>
          <text class="target">{{ cardData.goal?.target || cardData.target || 100 }}</text>
          <text class="unit">{{ cardData.goal?.unit || 'kg' }}</text>
        </view>
        <text class="progress-percent">{{ cardData.progress || 0 }}%</text>
      </view>

      <!-- 预计完成时间 -->
      <view v-if="cardData.estimatedDate || cardData.predictedCompletion" class="estimate">
        <text class="estimate-label">预计完成：</text>
        <text class="estimate-value">{{ cardData.estimatedDate || cardData.predictedCompletion }}</text>
      </view>

      <!-- 鼓励语 -->
      <view v-if="cardData.encouragement" class="encouragement">
        <text class="encourage-icon">✨</text>
        <text class="encourage-text">{{ cardData.encouragement }}</text>
      </view>
    </template>

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
import type { GoalProgressCardData } from './types'

const props = defineProps<{
  cardData: GoalProgressCardData
  actions?: Array<{ id: string; label: string; action: string; target?: string }>
  disabled?: boolean
}>()

const emit = defineEmits<{
  action: [actionId: string]
}>()

const goalLabels: Record<string, string> = {
  LOSE_FAT: '减脂目标',
  GAIN_MUSCLE: '增肌目标',
  BODY_SHAPE: '塑形目标',
  IMPROVE_FITNESS: '提升体能',
  lose_weight: '减脂目标',
  gain_muscle: '增肌目标',
  body_shape: '塑形目标'
}

const goalLabel = computed(() => {
  const type = props.cardData.goal?.type || props.cardData.goalType
  return goalLabels[type] || type || '健身目标'
})
</script>

<style lang="scss" scoped>
.goal-progress-card {
  padding: 16rpx;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.card-icon {
  font-size: 36rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.empty-state {
  text-align: center;
  padding: 40rpx 0;
}

.empty-icon {
  font-size: 64rpx;
  display: block;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #666;
}

.goal-type {
  margin-bottom: 20rpx;
}

.type-label {
  font-size: 26rpx;
  color: #666;
  background: #f0f0f0;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  display: inline-block;
}

.progress-section {
  margin-bottom: 16rpx;
}

.progress-bar {
  height: 20rpx;
  background: #eee;
  border-radius: 10rpx;
  overflow: hidden;
  margin-bottom: 8rpx;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #07c160, #06ad56);
  border-radius: 10rpx;
  transition: width 0.3s ease;
}

.progress-numbers {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 4rpx;
}

.current {
  font-size: 36rpx;
  font-weight: bold;
  color: #07c160;
}

.separator {
  font-size: 24rpx;
  color: #999;
  margin: 0 4rpx;
}

.target {
  font-size: 28rpx;
  color: #333;
}

.unit {
  font-size: 22rpx;
  color: #999;
  margin-left: 4rpx;
}

.progress-percent {
  font-size: 24rpx;
  color: #666;
  text-align: center;
  display: block;
  margin-top: 4rpx;
}

.estimate {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.estimate-label {
  font-size: 24rpx;
  color: #999;
}

.estimate-value {
  font-size: 24rpx;
  color: #666;
}

.encouragement {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  background: linear-gradient(135deg, #e8f8f0, #f0fff4);
  padding: 16rpx;
  border-radius: 12rpx;
}

.encourage-icon {
  font-size: 28rpx;
}

.encourage-text {
  font-size: 26rpx;
  color: #07c160;
  font-weight: 500;
}

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

.card-action-btn.confirm,
.card-action-btn.navigate {
  background: linear-gradient(135deg, #07c160, #06ad56);
  color: #fff;
}

.card-action-btn.cancel,
.card-action-btn.dismiss {
  background: #fff;
  color: #999;
  border: 1rpx solid #eee;
}
</style>
