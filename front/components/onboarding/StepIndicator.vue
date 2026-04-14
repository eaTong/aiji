<template>
  <view class="step-indicator">
    <view
      v-for="i in totalSteps"
      :key="i"
      :class="['step-dot', { active: i === currentStep, completed: i < currentStep }]"
    >
      <view v-if="i < currentStep" class="check-icon">✓</view>
      <text v-else class="step-num">{{ i }}</text>
    </view>
    <view class="step-line-wrapper">
      <view
        class="step-line"
        :style="{ width: `${((currentStep - 1) / (totalSteps - 1)) * 100}%` }"
      />
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  currentStep: number
  totalSteps: number
}>()
</script>

<style scoped>
.step-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  padding: 0 40rpx;
  margin-bottom: 48rpx;
}

.step-dot {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 2;
  transition: all 0.3s;
}

.step-dot.active {
  background: #333;
  transform: scale(1.1);
}

.step-dot.completed {
  background: #07c160;
}

.step-num {
  font-size: 24rpx;
  color: #fff;
  font-weight: bold;
}

.check-icon {
  font-size: 24rpx;
  color: #fff;
  font-weight: bold;
}

.step-line-wrapper {
  position: absolute;
  left: 80rpx;
  right: 80rpx;
  height: 4rpx;
  background: #e0e0e0;
  z-index: 1;
}

.step-line {
  height: 100%;
  background: #07c160;
  transition: width 0.3s;
}
</style>
