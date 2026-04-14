<template>
  <view class="morning-report-card">
    <view class="card-header">
      <text class="card-title">🌅 {{ cardData.greeting || '早安日报' }}</text>
      <text class="report-date">{{ cardData.date }}</text>
    </view>

    <view v-if="cardData.yesterdaySummary" class="yesterday-summary">
      <text class="summary-title">昨日概况</text>
      <view class="summary-stats">
        <view v-if="cardData.yesterdaySummary.weightChange" class="stat-item">
          <text class="stat-value" :class="getWeightChangeClass(cardData.yesterdaySummary.weightChange)">
            {{ formatWeightChange(cardData.yesterdaySummary.weightChange) }}
          </text>
          <text class="stat-label">体重变化</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ cardData.yesterdaySummary.trainingDone ? '✅' : '❌' }}</text>
          <text class="stat-label">训练</text>
        </view>
        <view v-if="cardData.yesterdaySummary.totalVolume" class="stat-item">
          <text class="stat-value">{{ cardData.yesterdaySummary.totalVolume }}kg</text>
          <text class="stat-label">容量</text>
        </view>
      </view>
    </view>

    <view v-if="cardData.todayPlan" class="today-plan">
      <text class="plan-label">今日计划</text>
      <text class="plan-name">{{ cardData.todayPlan.name || '暂无计划' }}</text>
      <view class="plan-meta">
        <text v-if="cardData.todayPlan.type">{{ cardData.todayPlan.type }}</text>
        <text v-if="cardData.todayPlan.duration">{{ cardData.todayPlan.duration }}分钟</text>
      </view>
    </view>

    <view v-if="cardData.recoveryTip" class="recovery-tip">
      <text class="tip-icon">💪</text>
      <text class="tip-text">{{ cardData.recoveryTip }}</text>
    </view>

    <view v-if="cardData.motivation" class="motivation">
      <text>{{ cardData.motivation }}</text>
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
import type { MorningReportCardData } from './types'

defineProps<{
  cardData: MorningReportCardData
  actions?: Array<{ id: string; label: string; action: string; target?: string }>
  disabled?: boolean
}>()

const emit = defineEmits<{
  action: [actionId: string]
}>()

function formatWeightChange(change: number): string {
  if (change > 0) return `+${change}kg`
  if (change < 0) return `${change}kg`
  return '0kg'
}

function getWeightChangeClass(change: number): string {
  if (change > 0) return 'change-up'
  if (change < 0) return 'change-down'
  return 'change-flat'
}
</script>

<style lang="scss" scoped>
.morning-report-card {
  padding: 16rpx;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
  padding-bottom: 12rpx;
  border-bottom: 1rpx solid #eee;
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #07c160;
}

.report-date {
  font-size: 24rpx;
  color: #666;
}

.yesterday-summary {
  margin-bottom: 16rpx;
}

.summary-title {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}

.summary-stats {
  display: flex;
  gap: 24rpx;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 4rpx;
}

.stat-value.change-up {
  color: #e53935;
}

.stat-value.change-down {
  color: #07c160;
}

.stat-label {
  font-size: 22rpx;
  color: #999;
}

.today-plan {
  background: #f5f5f5;
  border-radius: 8rpx;
  padding: 12rpx;
  margin-bottom: 16rpx;
}

.plan-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 4rpx;
}

.plan-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 4rpx;
}

.plan-meta {
  display: flex;
  gap: 16rpx;
  font-size: 24rpx;
  color: #666;
}

.recovery-tip {
  display: flex;
  align-items: center;
  gap: 8rpx;
  padding: 12rpx;
  background: #e8f8f0;
  border-radius: 8rpx;
  margin-bottom: 12rpx;
}

.tip-icon {
  font-size: 28rpx;
}

.tip-text {
  font-size: 24rpx;
  color: #07c160;
}

.motivation {
  text-align: center;
  font-size: 26rpx;
  color: #666;
  padding: 8rpx;
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
