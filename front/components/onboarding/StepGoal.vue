<template>
  <view class="step-goal">
    <text class="step-title">你健身的主要目标是什么？</text>
    <text class="step-subtitle">选择最符合你期望的选项</text>

    <view class="goal-list">
      <view
        v-for="item in goals"
        :key="item.value"
        :class="['goal-item', { selected: modelValue === item.value }]"
        @tap="emit('update:modelValue', item.value)"
      >
        <text class="goal-icon">{{ item.icon }}</text>
        <view class="goal-content">
          <text class="goal-name">{{ item.label }}</text>
          <text class="goal-desc">{{ item.desc }}</text>
        </view>
        <view v-if="modelValue === item.value" class="goal-check">✓</view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  modelValue: string
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

const goals = [
  { value: 'GAIN_MUSCLE', label: '增肌', desc: '增加肌肉量，提升力量', icon: '💪' },
  { value: 'LOSE_FAT', label: '减脂', desc: '减少体脂，塑造线条', icon: '🔥' },
  { value: 'BODY_SHAPE', label: '塑形', desc: '改善体态，紧致身材', icon: '✨' },
  { value: 'IMPROVE_FITNESS', label: '提升体能', desc: '增强体质，提高耐力', icon: '🏃' },
]
</script>

<style scoped>
.step-goal {
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

.goal-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.goal-item {
  display: flex;
  align-items: center;
  padding: 32rpx;
  background: #fff;
  border-radius: 24rpx;
  border: 4rpx solid transparent;
  transition: all 0.2s;
}

.goal-item.selected {
  border-color: #07c160;
  background: #f0fff4;
}

.goal-icon {
  font-size: 56rpx;
  margin-right: 24rpx;
}

.goal-content {
  flex: 1;
}

.goal-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.goal-desc {
  font-size: 26rpx;
  color: #999;
  display: block;
}

.goal-check {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #07c160;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: bold;
}
</style>
