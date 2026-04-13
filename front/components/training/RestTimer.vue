<template>
  <view class="rest-timer-overlay" v-if="visible">
    <view class="rest-timer-modal">
      <text class="timer-title">休息一下</text>
      <text class="timer-countdown">{{ formatTime(remainingSeconds) }}</text>
      <view class="timer-buttons">
        <view class="timer-btn add-btn" @tap="addTime">
          <text class="btn-text">+30s</text>
        </view>
        <view class="timer-btn skip-btn" @tap="onSkip">
          <text class="btn-text">跳过</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from 'vue'

const props = withDefaults(defineProps<{
  visible: boolean
  duration?: number
}>(), {
  duration: 90
})

const emit = defineEmits<{
  (e: 'done'): void
  (e: 'skip'): void
}>()

const remainingSeconds = ref(props.duration)
let timerInterval: ReturnType<typeof setInterval> | null = null

watch(() => props.visible, (val) => {
  if (val) {
    remainingSeconds.value = props.duration
    startTimer()
  } else {
    stopTimer()
  }
})

watch(() => props.duration, (val) => {
  if (props.visible) {
    remainingSeconds.value = val
  }
})

function startTimer() {
  stopTimer()
  timerInterval = setInterval(() => {
    if (remainingSeconds.value > 0) {
      remainingSeconds.value--
    } else {
      stopTimer()
      emit('done')
    }
  }, 1000)
}

function stopTimer() {
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }
}

function addTime() {
  remainingSeconds.value += 30
}

function onSkip() {
  stopTimer()
  emit('skip')
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

onUnmounted(() => {
  stopTimer()
})
</script>

<style>
.rest-timer-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.rest-timer-modal {
  width: 560rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.timer-title {
  font-size: 32rpx;
  color: #666;
  margin-bottom: 24rpx;
}
.timer-countdown {
  font-size: 96rpx;
  font-weight: bold;
  color: #333;
  font-family: -apple-system;
  margin-bottom: 48rpx;
}
.timer-buttons {
  display: flex;
  gap: 24rpx;
  width: 100%;
}
.timer-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.add-btn {
  background: #f5f5f5;
}
.skip-btn {
  background: #333;
}
.btn-text {
  font-size: 30rpx;
  color: #333;
}
.skip-btn .btn-text {
  color: #fff;
}
</style>