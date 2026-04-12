<script setup lang="ts">
import { ref, computed, watch } from 'vue'

type PartType = 'chest' | 'waist' | 'hip' | 'leftArm' | 'rightArm' | 'leftThigh' | 'rightThigh' | 'leftCalf' | 'rightCalf'

interface PartConfig {
  title: string
  subtitle: string
}

const partConfigs: Record<PartType, PartConfig> = {
  chest: { title: '胸围', subtitle: '测量胸部最丰满处' },
  waist: { title: '腰围', subtitle: '测量腹部最细处' },
  hip: { title: '臀围', subtitle: '测量臀部最宽处' },
  leftArm: { title: '左臂围', subtitle: '测量左臂肱三头肌最粗处' },
  rightArm: { title: '右臂围', subtitle: '测量右臂肱三头肌最粗处' },
  leftThigh: { title: '左大腿围', subtitle: '测量左大腿最粗处' },
  rightThigh: { title: '右大腿围', subtitle: '测量右大腿最粗处' },
  leftCalf: { title: '左小腿围', subtitle: '测量左小腿最粗处' },
  rightCalf: { title: '右小腿围', subtitle: '测量右小腿最粗处' }
}

const props = defineProps<{
  visible: boolean
  part: PartType | null
  currentValue?: number
  previousValue?: number
}>()

const emit = defineEmits<{
  confirm: [value: number]
  close: []
}>()

const inputValue = ref<string>('')
const inputNumber = ref<number | null>(null)

const partConfig = computed<PartConfig | null>(() => {
  if (!props.part) return null
  return partConfigs[props.part] || null
})

const delta = computed(() => {
  if (inputNumber.value === null || props.currentValue === undefined) return null
  return inputNumber.value - props.currentValue
})

const deltaText = computed(() => {
  if (delta.value === null) return ''
  const sign = delta.value > 0 ? '+' : ''
  return `${sign}${delta.value.toFixed(1)}cm`
})

const deltaClass = computed(() => {
  if (delta.value === null) return ''
  if (delta.value > 0) return 'delta-up'
  if (delta.value < 0) return 'delta-down'
  return ''
})

const isValidInput = computed(() => {
  if (inputNumber.value === null) return false
  return inputNumber.value >= 30 && inputNumber.value <= 200
})

watch(() => props.visible, (newVal) => {
  if (newVal) {
    inputValue.value = props.currentValue !== undefined ? String(props.currentValue) : ''
    inputNumber.value = props.currentValue !== undefined ? props.currentValue : null
  }
})

function onInput(e: any) {
  const value = e.detail.value
  inputValue.value = value
  const num = parseFloat(value)
  inputNumber.value = isNaN(num) ? null : num
}

function onConfirm() {
  if (inputNumber.value !== null && isValidInput.value) {
    emit('confirm', inputNumber.value)
  }
}

function onCancel() {
  emit('close')
}

function onMaskTap() {
  emit('close')
}
</script>

<template>
  <view v-if="visible" class="mask" @tap="onMaskTap">
    <view class="card" @tap.stop>
      <view class="header">
        <text class="title">{{ partConfig?.title }}</text>
        <text class="subtitle">{{ partConfig?.subtitle }}</text>
      </view>

      <view class="input-area">
        <input
          class="number-input"
          type="digit"
          :value="inputValue"
          placeholder="--"
          placeholder-class="placeholder"
          @input="onInput"
        />
        <text class="unit">cm</text>
      </view>

      <view class="delta-area" v-if="delta !== null">
        <text class="delta" :class="deltaClass">{{ deltaText }}</text>
      </view>

      <view class="values-row" v-if="previousValue !== undefined">
        <text class="value-label">上次</text>
        <text class="value">{{ previousValue.toFixed(1) }}cm</text>
      </view>

      <view class="buttons">
        <button class="btn btn-cancel" @tap="onCancel">取消</button>
        <button class="btn btn-confirm" @tap="onConfirm" :disabled="!isValidInput">确定</button>
      </view>
    </view>
  </view>
</template>

<style scoped>
.mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.card {
  width: 100%;
  background-color: #ffffff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 48rpx 32rpx 64rpx;
  box-sizing: border-box;
}

.header {
  text-align: center;
  margin-bottom: 48rpx;
}

.title {
  display: block;
  font-size: 40rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 12rpx;
}

.subtitle {
  display: block;
  font-size: 26rpx;
  color: #999999;
}

.input-area {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.number-input {
  width: 300rpx;
  font-size: 72rpx;
  text-align: center;
  color: #1a1a1a;
  font-weight: 500;
}

.placeholder {
  color: #cccccc;
}

.unit {
  font-size: 32rpx;
  color: #666666;
  margin-left: 8rpx;
}

.delta-area {
  text-align: center;
  margin-bottom: 24rpx;
}

.delta {
  font-size: 36rpx;
  font-weight: 500;
}

.delta-up {
  color: #ff9500;
}

.delta-down {
  color: #34c759;
}

.values-row {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
}

.value-label {
  font-size: 26rpx;
  color: #999999;
  margin-right: 8rpx;
}

.value {
  font-size: 28rpx;
  color: #666666;
}

.buttons {
  display: flex;
  gap: 24rpx;
}

.btn {
  flex: 1;
  height: 96rpx;
  line-height: 96rpx;
  border-radius: 48rpx;
  font-size: 32rpx;
  border: none;
}

.btn-cancel {
  background-color: #f5f5f5;
  color: #666666;
}

.btn-confirm {
  background-color: #007aff;
  color: #ffffff;
}

.btn-confirm[disabled] {
  background-color: #c7c7c7;
  color: #ffffff;
}
</style>
