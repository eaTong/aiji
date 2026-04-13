<template>
  <view class="recovery-score">
    <view class="score-circle">
      <text class="score-number">{{ score }}</text>
      <text class="score-label">恢复评分</text>
    </view>
    <view class="recommendation-badge" :class="recommendation.toLowerCase()">
      <text class="badge-text">{{ badgeText }}</text>
    </view>
    <view v-if="editable" class="sleep-row">
      <text class="sleep-label">睡眠时长</text>
      <input
        class="sleep-input"
        type="digit"
        :value="sleepHours"
        placeholder="0"
        @blur="onSleepBlur"
      />
      <text class="sleep-unit">小时</text>
    </view>
    <view v-else class="sleep-row">
      <text class="sleep-label">睡眠时长</text>
      <text class="sleep-value">{{ sleepHours ?? '--' }} 小时</text>
    </view>
  </view>
</template>

<script setup lang="ts">
const props = defineProps<{
  score: number
  recommendation: 'TRAIN' | 'REST' | 'LIGHT'
  sleepHours?: number
  editable?: boolean
}>()

const emit = defineEmits<{
  sleep: [hours: number]
}>()

const badgeText = {
  TRAIN: '适合训练',
  REST: '建议休息',
  LIGHT: '轻度活动',
}[props.recommendation]

function onSleepBlur(e: UniInputEvent) {
  const val = parseFloat(e.detail.value)
  if (!isNaN(val)) {
    emit('sleep', val)
  }
}
</script>

<style scoped>
.recovery-score {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.score-circle {
  width: 120px;
  height: 120px;
  border-radius: 60px;
  background: linear-gradient(135deg, #e8f5e9, #c8e6c9);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.score-number {
  font-size: 36px;
  font-weight: 700;
  color: #2e7d32;
}

.score-label {
  font-size: 13px;
  color: #4caf50;
}

.recommendation-badge {
  padding: 4px 16px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 500;
}

.recommendation-badge.train {
  background: #c8e6c9;
  color: #2e7d32;
}

.recommendation-badge.rest {
  background: #eeeeee;
  color: #757575;
}

.recommendation-badge.light {
  background: #ffe0b2;
  color: #e65100;
}

.badge-text {
  font-weight: 500;
}

.sleep-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  justify-content: center;
}

.sleep-label {
  font-size: 14px;
  color: #666;
}

.sleep-input {
  width: 60px;
  height: 32px;
  border: 1px solid #ddd;
  border-radius: 6px;
  text-align: center;
  font-size: 14px;
  padding: 0 4px;
}

.sleep-unit {
  font-size: 14px;
  color: #666;
}

.sleep-value {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}
</style>
