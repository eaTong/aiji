<template>
  <view v-if="visible" class="modal-mask" @click="close">
    <view class="modal-content" @click.stop>
      <!-- 标题 -->
      <view class="modal-header">
        <text class="modal-title">替换动作</text>
        <text class="close-btn" @click="close">×</text>
      </view>

      <!-- 当前动作 -->
      <view class="current-exercise">
        <text class="section-label">当前动作</text>
        <view class="exercise-card current">
          <text class="exercise-name">{{ currentExercise?.name }}</text>
          <text class="exercise-category">{{ categoryLabel }}</text>
        </view>
      </view>

      <!-- 替换原因 -->
      <view class="reason-section">
        <text class="section-label">替换原因</text>
        <view class="reason-list">
          <view
            v-for="item in reasonOptions"
            :key="item.value"
            :class="['reason-item', { selected: selectedReason === item.value }]"
            @click="selectedReason = item.value"
          >
            <text class="reason-icon">{{ item.icon }}</text>
            <text class="reason-label">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 可替换动作列表 -->
      <view class="replace-section">
        <text class="section-label">选择替换动作</text>
        <scroll-view scroll-y class="exercise-list">
          <view
            v-for="ex in replacableExercises"
            :key="ex.id"
            :class="['exercise-item', { selected: selectedExerciseId === ex.id }]"
            @click="selectedExerciseId = ex.id"
          >
            <view class="exercise-info">
              <text class="exercise-name">{{ ex.name }}</text>
              <text class="exercise-muscles">{{ formatMuscles(ex.primaryMuscles) }}</text>
            </view>
            <view v-if="selectedExerciseId === ex.id" class="check-icon">✓</view>
          </view>
          <view v-if="replacableExercises.length === 0" class="empty-tip">
            <text>没有可替换的动作</text>
          </view>
        </scroll-view>
      </view>

      <!-- 确认按钮 -->
      <view class="confirm-btn-wrapper">
        <button
          class="confirm-btn"
          :disabled="!canConfirm"
          @click="confirmReplace"
        >
          确认替换
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import {
  getReplacableExercises,
  replaceExercise,
  type Exercise,
  type ReplacementReason,
} from '../../api/trainingPlan'

const props = defineProps<{
  visible: boolean
  planId: string
  plannedExerciseId: string
  currentExercise: Exercise | undefined
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'replaced'): void
}>()

const reasonOptions = [
  { value: 'not_interested' as ReplacementReason, label: '不感兴趣', icon: '😴' },
  { value: 'no_equipment' as ReplacementReason, label: '没有器械', icon: '🏋️' },
  { value: 'dont_know_how' as ReplacementReason, label: '不会练', icon: '🤔' },
  { value: 'other' as ReplacementReason, label: '其他原因', icon: '📝' },
]

const replacableExercises = ref<Exercise[]>([])
const selectedReason = ref<ReplacementReason | ''>('')
const selectedExerciseId = ref<string>('')
const loading = ref(false)

const categoryLabels: Record<string, string> = {
  CHEST: '胸部',
  BACK: '背部',
  LEGS: '腿部',
  SHOULDERS: '肩部',
  ARMS: '手臂',
  CORE: '核心',
  CARDIO: '有氧',
}

const categoryLabel = computed(() => {
  if (!props.currentExercise?.category) return ''
  return categoryLabels[props.currentExercise.category] || props.currentExercise.category
})

const canConfirm = computed(() => {
  return selectedReason.value !== '' && selectedExerciseId.value !== ''
})

function formatMuscles(muscles: string[]): string {
  const muscleLabels: Record<string, string> = {
    chest: '胸肌',
    back: '背部',
    legs: '腿部',
    shoulders: '肩部',
    arms: '手臂',
    core: '核心',
    lats: '背阔肌',
    biceps: '二头肌',
    triceps: '三头肌',
    quads: '股四头肌',
    hamstrings: '腘绳肌',
    abs: '腹肌',
  }
  return muscles.map((m) => muscleLabels[m] || m).join(', ')
}

async function loadReplacableExercises() {
  if (!props.planId || !props.plannedExerciseId) return

  loading.value = true
  try {
    const result = await getReplacableExercises(props.planId, props.plannedExerciseId)
    replacableExercises.value = result.replacableExercises
  } catch (e) {
    console.error('获取可替换动作失败', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function confirmReplace() {
  if (!canConfirm.value || !props.planId || !props.plannedExerciseId) return

  try {
    await replaceExercise(props.planId, props.plannedExerciseId, {
      newExerciseId: selectedExerciseId.value,
      reason: selectedReason.value as ReplacementReason,
    })
    uni.showToast({ title: '替换成功', icon: 'success' })
    emit('replaced')
    close()
  } catch (e) {
    console.error('替换失败', e)
    uni.showToast({ title: '替换失败', icon: 'none' })
  }
}

function close() {
  // 重置状态
  selectedReason.value = ''
  selectedExerciseId.value = ''
  replacableExercises.value = []
  emit('close')
}

// 当弹窗显示时加载数据
watch(
  () => props.visible,
  (val) => {
    if (val) {
      loadReplacableExercises()
    }
  }
)
</script>

<style scoped>
.modal-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}

.modal-content {
  width: 100%;
  max-height: 85vh;
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 32rpx;
}

.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.close-btn {
  font-size: 48rpx;
  color: #999;
  padding: 0 16rpx;
}

.section-label {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 16rpx;
}

.current-exercise {
  margin-bottom: 32rpx;
}

.exercise-card {
  background: #f5f5f5;
  border-radius: 16rpx;
  padding: 24rpx;
}

.exercise-card.current {
  background: #fff3e0;
  border: 2rpx solid #ffe0b2;
}

.exercise-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
}

.exercise-category {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-top: 8rpx;
}

.exercise-muscles {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-top: 4rpx;
}

.reason-section {
  margin-bottom: 32rpx;
}

.reason-list {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.reason-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 16rpx;
  border: 4rpx solid transparent;
}

.reason-item.selected {
  border-color: #07c160;
  background: #f0fff4;
}

.reason-icon {
  font-size: 32rpx;
  margin-right: 12rpx;
}

.reason-label {
  font-size: 28rpx;
  color: #333;
}

.replace-section {
  flex: 1;
  min-height: 300rpx;
  margin-bottom: 24rpx;
}

.exercise-list {
  max-height: 400rpx;
}

.exercise-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx;
  background: #f9f9f9;
  border-radius: 16rpx;
  margin-bottom: 12rpx;
  border: 4rpx solid transparent;
}

.exercise-item.selected {
  border-color: #07c160;
  background: #f0fff4;
}

.exercise-info {
  flex: 1;
}

.check-icon {
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

.empty-tip {
  text-align: center;
  padding: 48rpx;
  color: #999;
  font-size: 28rpx;
}

.confirm-btn-wrapper {
  padding-top: 16rpx;
}

.confirm-btn {
  width: 100%;
  height: 96rpx;
  background: #07c160;
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
}

.confirm-btn[disabled] {
  background: #ccc;
  color: #fff;
}
</style>
