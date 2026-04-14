<template>
  <view class="container" v-if="exercise">
    <!-- Header -->
    <view class="section header-section">
      <text class="exercise-name">{{ exercise.name }}</text>
      <text v-if="exercise.nameEn" class="exercise-name-en">{{ exercise.nameEn }}</text>
      <view class="tag-row">
        <text class="tag category-tag">{{ catLabels[exercise.category] }}</text>
        <text class="tag equipment-tag">{{ equipLabels[exercise.equipment] }}</text>
      </view>
    </view>

    <!-- Muscle Groups -->
    <view class="section">
      <text class="section-title">肌肉群</text>
      <view class="muscle-group">
        <text class="group-label">主要肌群</text>
        <view class="tag-list">
          <text
            v-for="muscle in translatedPrimaryMuscles"
            :key="muscle"
            class="tag primary-tag"
          >{{ muscle }}</text>
        </view>
      </view>
      <view v-if="exercise.secondaryMuscles?.length" class="muscle-group">
        <text class="group-label">次要肌群</text>
        <view class="tag-list">
          <text
            v-for="muscle in translatedSecondaryMuscles"
            :key="muscle"
            class="tag secondary-tag"
          >{{ muscle }}</text>
        </view>
      </view>
    </view>

    <!-- Instructions -->
    <view v-if="displayInstructions" class="section">
      <text class="section-title">动作说明</text>
      <text class="instructions-text">{{ displayInstructions }}</text>
    </view>

    <!-- Warnings -->
    <view v-if="exercise.warnings" class="section warning-section">
      <text class="section-title">注意事项</text>
      <text class="warning-text">{{ exercise.warnings }}</text>
    </view>

    <!-- Common Mistakes -->
    <view v-if="exercise.commonMistakes" class="section mistake-section">
      <text class="section-title">常见错误</text>
      <text class="mistakes-text">{{ exercise.commonMistakes }}</text>
    </view>

    <!-- My Records -->
    <view class="section">
      <text class="section-title">我的记录</text>
      <view v-if="history.length > 0" class="history-list">
        <view
          v-for="(record, index) in history"
          :key="index"
          class="history-item"
        >
          <text class="history-date">{{ formatDate(record.recordedAt) }}</text>
          <text class="history-detail">{{ record.weight }} kg × {{ record.reps }} 次</text>
          <text v-if="record.e1rm" class="history-e1rm">E1RM: {{ record.e1rm.toFixed(0) }} kg</text>
        </view>
      </view>
      <view v-else class="empty-history">
        <text>暂无训练记录</text>
      </view>
    </view>

    <!-- Favorite Button -->
    <view class="bottom-action">
      <button
        :class="['fav-btn', { 'fav-btn-active': exercise.isFavorite }]"
        @tap="onToggleFavorite"
      >
        {{ exercise.isFavorite ? '已收藏' : '收藏' }}
      </button>
    </view>
  </view>

  <view v-else class="loading">
    <text>加载中...</text>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getExerciseById, toggleFavorite, type Exercise } from '../../api/exercise'
import { getExerciseHistory } from '../../api/trainingLog'
import { translateMuscles } from '../../utils/muscleMap'

const catLabels: Record<string, string> = {
  CHEST: '胸部',
  BACK: '背部',
  LEGS: '腿部',
  SHOULDERS: '肩部',
  ARMS: '手臂',
  CORE: '核心',
  CARDIO: '有氧',
}

const equipLabels: Record<string, string> = {
  GYM: '健身房',
  DUMBBELL: '哑铃',
  BODYWEIGHT: '自重',
}

interface HistoryRecord {
  weight: number
  reps: number
  e1rm?: number
  recordedAt: string
}

const exercise = ref<Exercise | null>(null)
const history = ref<HistoryRecord[]>([])
const exerciseId = ref('')

// 计算属性：翻译后的肌肉名称
const translatedPrimaryMuscles = computed(() => {
  if (!exercise.value?.primaryMuscles) return []
  return translateMuscles(exercise.value.primaryMuscles)
})

const translatedSecondaryMuscles = computed(() => {
  if (!exercise.value?.secondaryMuscles) return []
  return translateMuscles(exercise.value.secondaryMuscles)
})

// 计算属性：优先显示中文说明
const displayInstructions = computed(() => {
  if (!exercise.value) return ''
  // 优先使用中文说明，其次使用英文说明
  return exercise.value.instructionsZh || exercise.value.instructions || ''
})

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return `${d.getMonth() + 1}/${d.getDate()}`
}

async function onToggleFavorite() {
  if (!exercise.value) return
  try {
    const updated = await toggleFavorite(exerciseId.value)
    exercise.value.isFavorite = updated.isFavorite
  } catch (e) {
    console.error(e)
  }
}

onMounted(async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1]
  const options = (currentPage as any).options || {}
  exerciseId.value = options.id || ''

  if (!exerciseId.value) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    return
  }

  try {
    const [ex, hist] = await Promise.all([
      getExerciseById(exerciseId.value),
      getExerciseHistory(exerciseId.value),
    ])
    exercise.value = ex
    history.value = hist
  } catch (e) {
    console.error(e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
})
</script>

<style>
.container {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 140rpx;
}

.section {
  background: #fff;
  margin-bottom: 20rpx;
  padding: 32rpx 24rpx;
}

.header-section {
  display: flex;
  flex-direction: column;
}

.exercise-name {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
}

.exercise-name-en {
  font-size: 26rpx;
  color: #999;
  margin-top: 8rpx;
}

.tag-row {
  display: flex;
  gap: 12rpx;
  margin-top: 20rpx;
}

.tag {
  font-size: 24rpx;
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
}

.category-tag {
  background: #e8f0fe;
  color: #1a73e8;
}

.equipment-tag {
  background: #f0f0f0;
  color: #666;
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 20rpx;
}

.muscle-group {
  margin-bottom: 20rpx;
}

.group-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 12rpx;
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.primary-tag {
  background: #333;
  color: #fff;
  font-size: 24rpx;
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
}

.secondary-tag {
  background: #e0e0e0;
  color: #666;
  font-size: 24rpx;
  padding: 8rpx 20rpx;
  border-radius: 8rpx;
}

.instructions-text {
  font-size: 28rpx;
  color: #333;
  line-height: 1.8;
}

.warning-section {
  background: #fff3e0;
}

.warning-text {
  font-size: 28rpx;
  color: #e65100;
  line-height: 1.8;
}

.mistake-section {
  background: #fff3e0;
}

.mistakes-text {
  font-size: 28rpx;
  color: #e65100;
  line-height: 1.8;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.history-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
}

.history-date {
  font-size: 26rpx;
  color: #999;
  width: 100rpx;
}

.history-detail {
  font-size: 28rpx;
  color: #333;
  flex: 1;
  margin-left: 20rpx;
}

.history-e1rm {
  font-size: 26rpx;
  color: #1a73e8;
}

.empty-history {
  text-align: center;
  padding: 40rpx 0;
  color: #999;
  font-size: 28rpx;
}

.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  background: #fff;
  border-top: 1rpx solid #eee;
}

.fav-btn {
  width: 100%;
  background: #fff;
  color: #333;
  border: 2rpx solid #333;
  border-radius: 48rpx;
  font-size: 32rpx;
  padding: 0;
  line-height: 96rpx;
}

.fav-btn-active {
  background: #333;
  color: #fff;
}

.loading {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
  color: #999;
  font-size: 28rpx;
}
</style>
