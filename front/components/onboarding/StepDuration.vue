<template>
  <view class="step-duration">
    <text class="step-title">你健身多久了？</text>
    <text class="step-subtitle">帮助我们了解你的训练经验</text>

    <view class="duration-list">
      <view
        v-for="item in durations"
        :key="item.value"
        :class="['duration-item', { selected: modelValue === item.value }]"
        @tap="emit('update:modelValue', item.value)"
      >
        <text class="duration-icon">{{ item.icon }}</text>
        <view class="duration-content">
          <text class="duration-label">{{ item.label }}</text>
          <text class="duration-desc">{{ item.desc }}</text>
        </view>
        <view v-if="modelValue === item.value" class="duration-check">✓</view>
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

const durations = [
  { value: 'LESS_THAN_3M', label: '3个月以下', desc: '刚开始健身不久', icon: '🌱' },
  { value: 'THREE_TO_6M', label: '3-6个月', desc: '已有一定基础', icon: '🌿' },
  { value: 'SIX_TO_12M', label: '6-12个月', desc: '训练经验较丰富', icon: '🌲' },
  { value: 'OVER_1Y', label: '1年以上', desc: '资深健身爱好者', icon: '🏆' },
]
</script>

<style scoped>
.step-duration {
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

.duration-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.duration-item {
  display: flex;
  align-items: center;
  padding: 32rpx;
  background: #fff;
  border-radius: 24rpx;
  border: 4rpx solid transparent;
  transition: all 0.2s;
}

.duration-item.selected {
  border-color: #07c160;
  background: #f0fff4;
}

.duration-icon {
  font-size: 56rpx;
  margin-right: 24rpx;
}

.duration-content {
  flex: 1;
}

.duration-label {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.duration-desc {
  font-size: 26rpx;
  color: #999;
  display: block;
}

.duration-check {
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
