<template>
  <view class="weekly-report-card">
    <view class="card-header">
      <text class="report-title">📊 周报</text>
      <text class="report-period">{{ cardData.weekStart }} ~ {{ cardData.weekEnd }}</text>
    </view>

    <view class="report-stats">
      <view class="stat-item">
        <text class="stat-value">{{ trainingDays }}</text>
        <text class="stat-label">训练天数</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ totalVolume }}kg</text>
        <text class="stat-label">总容量</text>
      </view>
      <view class="stat-item">
        <text class="stat-value">{{ totalDuration }}</text>
        <text class="stat-label">总时长</text>
      </view>
    </view>

    <view v-if="cardData.weightChange" class="weight-change">
      体重变化: {{ formatWeightChange(cardData.weightChange) }}
    </view>

    <view v-if="cardData.stats?.prCount" class="pr-count">
      <text class="pr-icon">🏆</text>
      <text>打破 {{ cardData.stats.prCount }} 个个人记录</text>
    </view>

    <view v-if="cardData.highlight" class="highlight">
      <text class="highlight-text">{{ cardData.highlight }}</text>
    </view>

    <view v-if="cardData.aiComment" class="ai-comment">
      <text class="comment-label">AI点评</text>
      <text class="comment-text">{{ cardData.aiComment }}</text>
    </view>

    <view v-if="cardData.newAchievements?.length" class="new-achievements">
      <text class="achievement-title">新成就:</text>
      <view
        v-for="(ach, idx) in cardData.newAchievements"
        :key="idx"
        class="achievement-item"
      >
        {{ ach.icon || '🏆' }} {{ ach.name }}
      </view>
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
import type { WeeklyReportCardData } from './types'

const props = defineProps<{
  cardData: WeeklyReportCardData
  actions?: Array<{ id: string; label: string; action: string; target?: string }>
  disabled?: boolean
}>()

const emit = defineEmits<{
  action: [actionId: string]
}>()

const trainingDays = computed(() => {
  return props.cardData.stats?.trainingDays || props.cardData.totalTrainingDays || 0
})

const totalVolume = computed(() => {
  return props.cardData.stats?.totalVolume || props.cardData.totalVolume || 0
})

const totalDuration = computed(() => {
  const duration = props.cardData.stats?.totalDuration || props.cardData.totalDuration || 0
  if (duration === 0) return '--'
  if (duration < 60) return `${duration}分钟`
  const hours = Math.floor(duration / 60)
  const minutes = duration % 60
  return `${hours}h${minutes}m`
})

function formatWeightChange(change: number): string {
  if (change > 0) return `+${change}kg`
  if (change < 0) return `${change}kg`
  return '0kg'
}
</script>

<style lang="scss" scoped>
.weekly-report-card {
  padding: 16rpx;
}

.card-header {
  margin-bottom: 16rpx;
}

.report-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 4rpx;
}

.report-period {
  font-size: 24rpx;
  color: #666;
  display: block;
}

.report-stats {
  display: flex;
  justify-content: space-around;
  margin: 16rpx 0;
  padding: 16rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #07c160;
}

.stat-label {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

.weight-change {
  font-size: 26rpx;
  color: #ff9800;
  text-align: center;
  margin-bottom: 12rpx;
}

.pr-count {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8rpx;
  font-size: 26rpx;
  color: #ff9800;
  margin-bottom: 12rpx;
}

.pr-icon {
  font-size: 28rpx;
}

.highlight {
  padding: 12rpx;
  background: linear-gradient(135deg, #07c160, #06ad56);
  border-radius: 8rpx;
  margin-bottom: 12rpx;
}

.highlight-text {
  font-size: 26rpx;
  color: #fff;
  display: block;
  text-align: center;
}

.ai-comment {
  margin-top: 12rpx;
  padding: 12rpx;
  background: #f9f9f9;
  border-radius: 8rpx;
}

.comment-label {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-bottom: 4rpx;
}

.comment-text {
  font-size: 24rpx;
  color: #666;
}

.new-achievements {
  margin-top: 12rpx;
  padding-top: 12rpx;
  border-top: 1rpx solid #eee;
}

.achievement-title {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 8rpx;
}

.achievement-item {
  font-size: 26rpx;
  color: #333;
  padding: 4rpx 0;
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
