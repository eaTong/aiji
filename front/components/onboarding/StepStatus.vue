<template>
  <view class="step-status">
    <text class="step-title">你的健身基础</text>
    <text class="step-subtitle">帮助我们为你匹配合适的训练强度</text>

    <!-- 训练水平 -->
    <view class="section">
      <text class="section-label">训练水平</text>
      <view class="option-grid">
        <view
          v-for="item in levels"
          :key="item.value"
          :class="['option-item', { selected: level === item.value }]"
          @tap="level = item.value"
        >
          <text class="option-icon">{{ item.icon }}</text>
          <text class="option-label">{{ item.label }}</text>
        </view>
      </view>
    </view>

    <!-- 可用器材 -->
    <view class="section">
      <text class="section-label">可用器材</text>
      <view class="option-list">
        <view
          v-for="item in equipments"
          :key="item.value"
          :class="['option-row', { selected: equipment === item.value }]"
          @tap="equipment = item.value"
        >
          <text class="option-icon">{{ item.icon }}</text>
          <view class="option-content">
            <text class="option-label">{{ item.label }}</text>
            <text class="option-desc">{{ item.desc }}</text>
          </view>
          <view v-if="equipment === item.value" class="option-check">✓</view>
        </view>
      </view>
    </view>

    <!-- 每周训练天数 -->
    <view class="section">
      <text class="section-label">每周能训练几天？</text>
      <view class="day-selector">
        <view
          v-for="d in 7"
          :key="d"
          :class="['day-btn', { selected: weeklyDays === d }]"
          @tap="weeklyDays = d"
        >
          {{ d }}
        </view>
      </view>
      <text class="day-hint">建议每周至少3天才能看到明显效果</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  level: string
  equipment: string
  weeklyDays: number
}>()

const emit = defineEmits<{
  (e: 'update:level', value: string): void
  (e: 'update:equipment', value: string): void
  (e: 'update:weeklyDays', value: number): void
}>()

const levels = [
  { value: 'BEGINNER', label: '初学者', icon: '🌱' },
  { value: 'INTERMEDIATE', label: '中级', icon: '🌿' },
  { value: 'ADVANCED', label: '高级', icon: '🌳' },
]

const equipments = [
  { value: 'GYM', label: '健身房', desc: '杠铃、哑铃、器械齐全', icon: '🏋️' },
  { value: 'DUMBBELL', label: '哑铃/家庭健身', desc: '有哑铃或简易器械', icon: '🏠' },
  { value: 'BODYWEIGHT', label: '自重训练', desc: '无器材，徒手训练', icon: '🧘' },
]

const level = computed({
  get: () => props.level,
  set: (v) => emit('update:level', v),
})

const equipment = computed({
  get: () => props.equipment,
  set: (v) => emit('update:equipment', v),
})

const weeklyDays = computed({
  get: () => props.weeklyDays,
  set: (v) => emit('update:weeklyDays', v),
})
</script>

<style scoped>
.step-status {
  padding: 0 32rpx;
}

.step-title {
  font-size: 44rpx;
  font-weight: bold;
  color: #333;
  display: block;
  text-align: center;
  margin-bottom: 16rpx;
}

.step-subtitle {
  font-size: 28rpx;
  color: #999;
  display: block;
  text-align: center;
  margin-bottom: 48rpx;
}

.section {
  margin-bottom: 48rpx;
}

.section-label {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 24rpx;
}

.option-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
}

.option-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 32rpx 16rpx;
  background: #fff;
  border-radius: 20rpx;
  border: 4rpx solid transparent;
  transition: all 0.2s;
}

.option-item.selected {
  border-color: #07c160;
  background: #f0fff4;
}

.option-icon {
  font-size: 48rpx;
  margin-bottom: 12rpx;
}

.option-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.option-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.option-row {
  display: flex;
  align-items: center;
  padding: 28rpx;
  background: #fff;
  border-radius: 20rpx;
  border: 4rpx solid transparent;
  transition: all 0.2s;
}

.option-row.selected {
  border-color: #07c160;
  background: #f0fff4;
}

.option-row .option-icon {
  font-size: 40rpx;
  margin-right: 20rpx;
  margin-bottom: 0;
}

.option-content {
  flex: 1;
}

.option-row .option-label {
  font-size: 30rpx;
  font-weight: bold;
  display: block;
  margin-bottom: 4rpx;
}

.option-desc {
  font-size: 24rpx;
  color: #999;
  display: block;
}

.option-check {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #07c160;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  font-weight: bold;
}

.day-selector {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.day-btn {
  flex: 1;
  height: 88rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
  font-weight: bold;
  color: #666;
  border: 4rpx solid transparent;
  transition: all 0.2s;
}

.day-btn.selected {
  background: #333;
  color: #fff;
  border-color: #333;
}

.day-hint {
  font-size: 24rpx;
  color: #999;
  text-align: center;
  display: block;
}
</style>
