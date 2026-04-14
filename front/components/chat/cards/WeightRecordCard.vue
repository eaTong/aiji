<template>
  <view class="weight-record-card">
    <view class="card-header">
      <text class="card-title">📝 体重记录</text>
    </view>

    <view class="weight-main">
      <text class="weight-value">
        {{ displayWeight }}
      </text>
      <text class="weight-unit">{{ cardData.unit || 'kg' }}</text>
    </view>

    <view class="weight-date">
      <text>{{ displayDate }}</text>
    </view>

    <view v-if="cardData.saved" class="saved-badge">已保存</view>

    <view v-if="cardData.error" class="card-error">
      <text>{{ cardData.error }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { WeightRecordCardData } from './types'

const props = defineProps<{
  cardData: WeightRecordCardData
  actions?: any[]
  disabled?: boolean
}>()

const emit = defineEmits<{
  action: [actionId: string]
}>()

const displayWeight = computed(() => {
  if (props.cardData.weight !== undefined) {
    return props.cardData.weight
  }
  if (props.cardData.latestWeight !== undefined) {
    return props.cardData.latestWeight
  }
  return '--'
})

const displayDate = computed(() => {
  if (props.cardData.date) {
    return props.cardData.date
  }
  if (props.cardData.lastRecordDate) {
    return `上次记录: ${props.cardData.lastRecordDate}`
  }
  return ''
})
</script>

<style lang="scss" scoped>
.weight-record-card {
  padding: 24rpx;
}

.card-header {
  margin-bottom: 16rpx;
}

.card-title {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

.weight-main {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8rpx;
  margin-bottom: 12rpx;
}

.weight-value {
  font-size: 56rpx;
  font-weight: bold;
  color: #07c160;
}

.weight-unit {
  font-size: 28rpx;
  color: #666;
}

.weight-date {
  display: block;
  font-size: 24rpx;
  color: #999;
  text-align: center;
}

.saved-badge {
  display: inline-block;
  background: #e8f5e9;
  color: #07c160;
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  margin-top: 12rpx;
}

.card-error {
  color: #e53935;
  font-size: 24rpx;
  text-align: center;
  margin-top: 8rpx;
}
</style>
