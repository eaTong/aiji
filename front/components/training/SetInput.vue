<template>
  <view class="set-input">
    <text class="set-number">{{ setNumber }}</text>
    <input
      type="digit"
      class="weight-input"
      :value="weight"
      placeholder="0"
      @input="onWeightInput"
    />
    <text class="unit">kg</text>
    <text class="separator">×</text>
    <input
      type="number"
      class="reps-input"
      :value="reps"
      placeholder="0"
      @input="onRepsInput"
    />
    <text class="unit">次</text>
    <view class="warmup-toggle" :class="{ active: isWarmup }" @tap="toggleWarmup">
      <text class="warmup-text">热身</text>
    </view>
    <view class="remove-btn" @tap="onRemove">
      <text class="remove-icon">×</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'

const props = defineProps<{
  setNumber: number
  weight: number
  reps: number
  isWarmup: boolean
  suggestedWeight?: number
}>()

const emit = defineEmits<{
  (e: 'update:weight', value: number): void
  (e: 'update:reps', value: number): void
  (e: 'update:isWarmup', value: boolean): void
  (e: 'remove'): void
}>()

const localWeight = ref(props.weight || props.suggestedWeight || 0)
const localReps = ref(props.reps)

watch(() => props.weight, (v) => { localWeight.value = v })
watch(() => props.reps, (v) => { localReps.value = v })
watch(() => props.suggestedWeight, (v) => {
  if (v && !props.weight) localWeight.value = v
})

function onWeightInput(e: any) {
  const val = parseFloat(e.detail.value)
  if (!isNaN(val)) {
    localWeight.value = val
    emit('update:weight', val)
  }
}

function onRepsInput(e: any) {
  const val = parseInt(e.detail.value)
  if (!isNaN(val)) {
    localReps.value = val
    emit('update:reps', val)
  }
}

function toggleWarmup() {
  emit('update:isWarmup', !props.isWarmup)
}

function onRemove() {
  emit('remove')
}
</script>

<style>
.set-input {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.set-number {
  width: 48rpx;
  height: 48rpx;
  background: #f5f5f5;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: #666;
  margin-right: 16rpx;
}
.weight-input {
  width: 120rpx;
  height: 64rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  text-align: center;
  font-size: 28rpx;
  padding: 0 8rpx;
}
.reps-input {
  width: 100rpx;
  height: 64rpx;
  border: 1rpx solid #ddd;
  border-radius: 8rpx;
  text-align: center;
  font-size: 28rpx;
  padding: 0 8rpx;
}
.unit {
  font-size: 24rpx;
  color: #999;
  margin: 0 8rpx;
}
.separator {
  font-size: 28rpx;
  color: #333;
  margin: 0 8rpx;
}
.warmup-toggle {
  width: 96rpx;
  height: 48rpx;
  border: 1rpx solid #ddd;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 16rpx;
  background: #f5f5f5;
}
.warmup-toggle.active {
  background: #ff9500;
  border-color: #ff9500;
}
.warmup-text {
  font-size: 22rpx;
  color: #666;
}
.warmup-toggle.active .warmup-text {
  color: #fff;
}
.remove-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-left: 16rpx;
}
.remove-icon {
  font-size: 36rpx;
  color: #ccc;
  line-height: 1;
}
</style>