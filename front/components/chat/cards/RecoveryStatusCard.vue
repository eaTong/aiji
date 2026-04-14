<template>
  <view class="recovery-status-card">
    <view class="card-header">
      <text class="card-title">💪 恢复状态</text>
    </view>

    <view v-if="cardData.message" class="message">
      <text>{{ cardData.message }}</text>
    </view>

    <template v-else>
      <view class="recovery-score">
        <text class="score-label">整体恢复</text>
        <view class="score-bar">
          <view
            class="score-fill"
            :style="{ width: (cardData.overallScore || 0) + '%' }"
            :class="getScoreClass(cardData.overallScore || 0)"
          />
        </view>
        <text class="score-value">{{ cardData.overallScore || 0 }}</text>
      </view>

      <view v-if="cardData.muscles?.length" class="muscle-grid">
        <view
          v-for="muscle in cardData.muscles"
          :key="muscle.name"
          class="muscle-item"
        >
          <text class="muscle-name">{{ muscle.label || muscle.name }}</text>
          <view class="muscle-bar">
            <view
              class="muscle-fill"
              :style="{ width: muscle.recoveryPercent + '%' }"
              :class="getMuscleStatusClass(muscle.status)"
            />
          </view>
          <text class="muscle-pct">{{ muscle.recoveryPercent }}%</text>
        </view>
      </view>

      <view v-if="cardData.recommendation" class="recommendation">
        <text class="recommendation-text">{{ cardData.recommendation }}</text>
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
import type { RecoveryStatusCardData } from './types'

defineProps<{
  cardData: RecoveryStatusCardData
  actions?: Array<{ id: string; label: string; action: string; target?: string }>
  disabled?: boolean
}>()

const emit = defineEmits<{
  action: [actionId: string]
}>()

function getScoreClass(score: number): string {
  if (score >= 75) return 'score-good'
  if (score >= 50) return 'score-warning'
  return 'score-danger'
}

function getMuscleStatusClass(status: string): string {
  switch (status) {
    case 'recovered': return 'status-good'
    case 'recovering': return 'status-warning'
    case 'fatigued': return 'status-danger'
    default: return 'status-default'
  }
}
</script>

<style lang="scss" scoped>
.recovery-status-card {
  padding: 16rpx;
}

.card-header {
  margin-bottom: 16rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.message {
  text-align: center;
  padding: 24rpx;
  color: #666;
  font-size: 26rpx;
}

.recovery-score {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.score-label {
  font-size: 24rpx;
  color: #666;
}

.score-bar {
  flex: 1;
  height: 16rpx;
  background: #eee;
  border-radius: 8rpx;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 8rpx;
  transition: width 0.3s;
}

.score-fill.score-good {
  background: #07c160;
}

.score-fill.score-warning {
  background: #ff9800;
}

.score-fill.score-danger {
  background: #e53935;
}

.score-value {
  font-size: 24rpx;
  font-weight: 600;
  color: #333;
  min-width: 40rpx;
}

.muscle-grid {
  margin-bottom: 16rpx;
}

.muscle-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 8rpx 0;
}

.muscle-name {
  font-size: 24rpx;
  color: #666;
  width: 60rpx;
}

.muscle-bar {
  flex: 1;
  height: 12rpx;
  background: #eee;
  border-radius: 6rpx;
}

.muscle-fill {
  height: 100%;
  border-radius: 6rpx;
  transition: width 0.3s;
}

.muscle-fill.status-good {
  background: #07c160;
}

.muscle-fill.status-warning {
  background: #ff9800;
}

.muscle-fill.status-danger {
  background: #e53935;
}

.muscle-fill.status-default {
  background: #999;
}

.muscle-pct {
  font-size: 22rpx;
  color: #999;
  width: 50rpx;
  text-align: right;
}

.recommendation {
  padding: 12rpx;
  background: #f5f5f5;
  border-radius: 8rpx;
}

.recommendation-text {
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
