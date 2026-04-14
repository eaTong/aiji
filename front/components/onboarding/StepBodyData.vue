<template>
  <view class="step-body-data">
    <text class="step-title">身体数据（选填）</text>
    <text class="step-subtitle">填写后可获得更精准的训练和饮食建议</text>

    <view class="form-list">
      <view class="form-item">
        <text class="form-label">身高 (cm)</text>
        <input
          type="digit"
          :value="height"
          @input="onHeightInput"
          placeholder="例如：175"
          class="form-input"
        />
      </view>

      <view class="form-item">
        <text class="form-label">当前体重 (kg)</text>
        <input
          type="digit"
          :value="currentWeight"
          @input="onCurrentWeightInput"
          placeholder="例如：70"
          class="form-input"
        />
      </view>

      <view class="form-item">
        <text class="form-label">目标体重 (kg)</text>
        <input
          type="digit"
          :value="targetWeight"
          @input="onTargetWeightInput"
          placeholder="例如：65"
          class="form-input"
        />
      </view>
    </view>

    <view class="skip-hint">
      <text class="skip-text">以上信息可跳过，稍后在个人资料中补充</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  height?: number
  currentWeight?: number
  targetWeight?: number
}>()

const emit = defineEmits<{
  (e: 'update:height', value?: number): void
  (e: 'update:currentWeight', value?: number): void
  (e: 'update:targetWeight', value?: number): void
}>()

const height = computed({
  get: () => props.height,
  set: (v) => emit('update:height', v),
})

const currentWeight = computed({
  get: () => props.currentWeight,
  set: (v) => emit('update:currentWeight', v),
})

const targetWeight = computed({
  get: () => props.targetWeight,
  set: (v) => emit('update:targetWeight', v),
})

function onHeightInput(e: any) {
  const v = parseFloat(e.detail.value)
  emit('update:height', isNaN(v) ? undefined : v)
}

function onCurrentWeightInput(e: any) {
  const v = parseFloat(e.detail.value)
  emit('update:currentWeight', isNaN(v) ? undefined : v)
}

function onTargetWeightInput(e: any) {
  const v = parseFloat(e.detail.value)
  emit('update:targetWeight', isNaN(v) ? undefined : v)
}
</script>

<style scoped>
.step-body-data {
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

.form-list {
  display: flex;
  flex-direction: column;
  gap: 32rpx;
}

.form-item {
  background: #fff;
  border-radius: 20rpx;
  padding: 32rpx;
}

.form-label {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 16rpx;
}

.form-input {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  padding: 0;
  height: auto;
}

.skip-hint {
  margin-top: 32rpx;
  text-align: center;
}

.skip-text {
  font-size: 26rpx;
  color: #999;
}
</style>
