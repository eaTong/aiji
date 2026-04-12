<template>
  <view class="weight-input">
    <text class="label">今日体重</text>
    <view class="input-row">
      <input
        type="digit"
        v-model="weightStr"
        placeholder="0.0"
        class="input"
        @input="onInput"
      />
      <text class="unit">kg</text>
    </view>
    <input
      type="text"
      v-model="note"
      placeholder="备注（可选）"
      class="note-input"
    />
    <button class="submit-btn" :disabled="!isValid" @tap="submit">保存</button>
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

const emit = defineEmits<{
  (e: 'submit', weight: number, note: string): void
}>()

const weightStr = ref('')
const note = ref('')

const isValid = computed(() => {
  const v = parseFloat(weightStr.value)
  return !isNaN(v) && v > 20 && v < 300
})

function onInput() {
  weightStr.value = weightStr.value.replace(/[^\d.]/g, '')
}

function submit() {
  if (!isValid.value) return
  emit('submit', parseFloat(weightStr.value), note.value)
  weightStr.value = ''
  note.value = ''
}
</script>

<style>
.weight-input { padding: 32rpx; }
.label { font-size: 28rpx; color: #666; display: block; margin-bottom: 16rpx; }
.input-row { display: flex; align-items: center; }
.input { flex: 1; font-size: 64rpx; font-weight: bold; border-bottom: 2rpx solid #eee; padding: 16rpx 0; }
.unit { font-size: 32rpx; color: #999; margin-left: 16rpx; }
.note-input { width: 100%; border: 1rpx solid #eee; border-radius: 16rpx; padding: 16rpx; font-size: 28rpx; margin-top: 16rpx; box-sizing: border-box; }
.submit-btn { margin-top: 32rpx; background: #333; color: #fff; border-radius: 48rpx; }
.submit-btn[disabled] { background: #ccc; }
</style>