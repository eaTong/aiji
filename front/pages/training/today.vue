<template>
  <view class="today-page">
    <!-- Header -->
    <view class="header">
      <text class="date">{{ formattedDate }}</text>
      <text class="title">今日训练</text>
    </view>

    <!-- Training not started -->
    <view class="start-training" v-if="!currentLogId">
      <view class="start-content">
        <text class="start-icon">🏋️</text>
        <text class="start-text">准备好开始今天的训练了吗？</text>
        <button class="start-btn" @tap="startTrainingLog">开始训练</button>
      </view>
    </view>

    <!-- Training in progress -->
    <view class="training-active" v-else>
      <!-- Stats bar -->
      <view class="stats-bar">
        <view class="stat-item">
          <text class="stat-value">{{ exerciseItems.length }}</text>
          <text class="stat-label">动作</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ pendingEntries.length }}</text>
          <text class="stat-label">组数</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ totalVolume }}kg</text>
          <text class="stat-label">总量</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ formatElapsed(elapsedSeconds) }}</text>
          <text class="stat-label">时长</text>
        </view>
      </view>

      <!-- Exercise list -->
      <view class="exercise-list">
        <ExerciseCard
          v-for="item in exerciseItems"
          :key="item.exercise.id"
          :exercise="item.exercise"
          :lastRecord="item.lastRecord"
          @change="onExerciseChange(item.exercise.id, $event)"
        />
      </view>

      <!-- Action buttons -->
      <view class="action-buttons">
        <button class="add-exercise-btn" @tap="showExercisePicker = true">添加动作</button>
        <button class="finish-btn" @tap="finishTraining">完成训练</button>
      </view>
    </view>

    <!-- Exercise picker modal -->
    <ExerciseSelector
      :visible="showExercisePicker"
      @close="showExercisePicker = false"
      @select="onExerciseSelect"
    />

    <!-- Rest timer -->
    <RestTimer
      :visible="timerVisible"
      :duration="90"
      @done="onTimerDone"
      @skip="timerVisible = false"
    />

    <!-- Summary modal -->
    <view class="summary-overlay" v-if="showSummary" @tap="showSummary = false">
      <view class="summary-modal" @tap.stop>
        <text class="summary-title">训练完成</text>
        <view class="summary-stats">
          <view class="summary-stat">
            <text class="summary-stat-value">{{ summaryData.totalVolume }}kg</text>
            <text class="summary-stat-label">总重量</text>
          </view>
          <view class="summary-stat">
            <text class="summary-stat-value">{{ formatElapsed(summaryData.duration) }}</text>
            <text class="summary-stat-label">时长</text>
          </view>
          <view class="summary-stat">
            <text class="summary-stat-value">{{ summaryData.exerciseCount }}</text>
            <text class="summary-stat-label">动作数</text>
          </view>
        </view>
        <button class="summary-btn" @tap="closeSummary">确定</button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, getCurrentInstance } from 'vue'
import ExerciseCard from '../../components/training/ExerciseCard.vue'
import SetInput from '../../components/training/SetInput.vue'
import RestTimer from '../../components/training/RestTimer.vue'
import ExerciseSelector from '../../components/training/ExerciseSelector.vue'
import {
  startTrainingLog,
  finishTrainingLog,
  addTrainingLogEntry,
  getTrainingLogs,
  getExerciseHistory
} from '../../api/trainingLog'
import { getExercises } from '../../api/exercise'
import type { Exercise } from '../../api/exercise'

// 预填动作的接口
interface RecommendedExercise {
  name: string
  sets: number
  reps: string
  lastWeight?: number
}

interface RecommendedTraining {
  name: string
  duration: number
  type: string
  targetMuscle: string
  exercises: RecommendedExercise[]
  reason: string
}

// 获取页面参数
const pageInstance = getCurrentInstance()
const preloadedTraining = ref<RecommendedTraining | null>(null)
const preloadedExercises = ref<{ id: string; name: string; sets: number; reps: string; lastWeight?: number }[]>([])

interface ExerciseItem {
  exercise: Exercise
  lastRecord?: { weight: number; reps: number; e1rm?: number }
}

interface SetData {
  weight: number
  reps: number
  isWarmup: boolean
}

interface PendingEntry {
  exerciseId: string
  exerciseName: string
  setNumber: number
  weight: number
  reps: number
  isWarmup: boolean
}

// State
const currentLogId = ref<string | null>(null)
const exerciseItems = ref<ExerciseItem[]>([])
const pendingEntries = ref<PendingEntry[]>([])
const totalVolume = ref(0)
const elapsedSeconds = ref(0)
const timerVisible = ref(false)
const showExercisePicker = ref(false)
const allExercises = ref<Exercise[]>([])
const showSummary = ref(false)
const summaryData = ref({ totalVolume: 0, duration: 0, exerciseCount: 0 })

let elapsedTimer: ReturnType<typeof setInterval> | null = null

// Computed
const formattedDate = computed(() => {
  const now = new Date()
  return `${now.getMonth() + 1}月${now.getDate()}日`
})

// Methods
function formatElapsed(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

async function startTrainingLog() {
  try {
    const res = await startTrainingLog()
    currentLogId.value = res.id
    startElapsedTimer()
  } catch (err) {
    console.error('Failed to start training log:', err)
  }
}

async function finishTraining() {
  if (!currentLogId.value) return

  try {
    // Submit all pending entries
    for (const entry of pendingEntries.value) {
      await addTrainingLogEntry({
        logId: currentLogId.value,
        exerciseId: entry.exerciseId,
        exerciseName: entry.exerciseName,
        setNumber: entry.setNumber,
        weight: entry.weight,
        reps: entry.reps,
        isWarmup: entry.isWarmup
      })
    }

    // Finish the training log
    const res = await finishTrainingLog(currentLogId.value)

    // Show summary
    summaryData.value = {
      totalVolume: res.totalVolume,
      duration: res.duration,
      exerciseCount: exerciseItems.value.length
    }
    showSummary.value = true

    // Stop timer and reset
    stopElapsedTimer()
    currentLogId.value = null
    exerciseItems.value = []
    pendingEntries.value = []
    totalVolume.value = 0
    elapsedSeconds.value = 0
  } catch (err) {
    console.error('Failed to finish training:', err)
  }
}

async function loadExercises() {
  try {
    allExercises.value = await getExercises()
  } catch (err) {
    console.error('Failed to load exercises:', err)
  }
}

async function onExerciseSelect(exerciseData: { id: string; name: string }) {
  // Find full exercise from allExercises
  const exercise = allExercises.value.find(e => e.id === exerciseData.id)
  if (!exercise) return

  // Check if already added
  if (exerciseItems.value.some((item) => item.exercise.id === exercise.id)) {
    uni.showToast({ title: '该动作已添加', icon: 'none' })
    return
  }

  // Get exercise history for last record
  let lastRecord: { weight: number; reps: number; e1rm?: number } | undefined
  try {
    const history = await getExerciseHistory(exercise.id)
    if (history.length > 0) {
      const last = history[0]
      lastRecord = {
        weight: last.weight,
        reps: last.reps,
        e1rm: last.e1rm
      }
    }
  } catch {
    // History not available
  }

  exerciseItems.value.push({ exercise, lastRecord })
  showExercisePicker.value = false
}

function onExerciseChange(exerciseId: string, sets: SetData[]) {
  // Remove existing entries for this exercise
  pendingEntries.value = pendingEntries.value.filter(
    (e) => e.exerciseId !== exerciseId
  )

  // Add new entries
  const exercise = exerciseItems.value.find((item) => item.exercise.id === exerciseId)
  if (!exercise) return

  sets.forEach((set, index) => {
    if (set.weight > 0 || set.reps > 0) {
      pendingEntries.value.push({
        exerciseId,
        exerciseName: exercise.exercise.name,
        setNumber: index + 1,
        weight: set.weight,
        reps: set.reps,
        isWarmup: set.isWarmup
      })
    }
  })

  // Recalculate total volume
  recalculateTotalVolume()

  // Show rest timer after adding a set
  if (sets.length > 0 && (sets[sets.length - 1].weight > 0 || sets[sets.length - 1].reps > 0)) {
    timerVisible.value = true
  }
}

function recalculateTotalVolume() {
  totalVolume.value = pendingEntries.value.reduce((sum, entry) => {
    if (!entry.isWarmup) {
      return sum + entry.weight * entry.reps
    }
    return sum
  }, 0)
}

function startElapsedTimer() {
  stopElapsedTimer()
  elapsedTimer = setInterval(() => {
    elapsedSeconds.value++
  }, 1000)
}

function stopElapsedTimer() {
  if (elapsedTimer) {
    clearInterval(elapsedTimer)
    elapsedTimer = null
  }
}

function onTimerDone() {
  timerVisible.value = false
}

function closeSummary() {
  showSummary.value = false
}

async function checkExistingLog() {
  try {
    const logs = await getTrainingLogs()
    const inProgress = logs.find((log) => log.status === 'IN_PROGRESS')
    if (inProgress) {
      currentLogId.value = inProgress.id
      startElapsedTimer()
    }
  } catch (err) {
    console.error('Failed to check existing log:', err)
  }
}

onMounted(async () => {
  // 解析页面参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const options = currentPage.options || {}

  // 解析预填的训练数据
  if (options.training) {
    try {
      preloadedTraining.value = JSON.parse(decodeURIComponent(options.training))
      // 预填动作到列表
      if (preloadedTraining.value?.exercises) {
        await loadExercises()
        for (const ex of preloadedTraining.value.exercises) {
          const matched = allExercises.value.find(
            e => e.name === ex.name || e.nameEn === ex.name
          )
          if (matched) {
            preloadedExercises.value.push({
              id: matched.id,
              name: matched.name,
              sets: ex.sets,
              reps: ex.reps,
              lastWeight: ex.lastWeight
            })
          }
        }
        // 如果有预填动作，自动开始训练
        if (preloadedExercises.value.length > 0) {
          await startTrainingLog()
          // 添加预填的动作
          for (const ex of preloadedExercises.value) {
            const exercise = allExercises.value.find(e => e.id === ex.id)
            if (exercise) {
              exerciseItems.value.push({
                exercise,
                lastRecord: ex.lastWeight ? { weight: ex.lastWeight, reps: parseInt(ex.reps) } : undefined
              })
            }
          }
        }
      }
    } catch (e) {
      console.error('解析预填数据失败', e)
    }
  }

  loadExercises()
  checkExistingLog()
})

onUnmounted(() => {
  stopElapsedTimer()
})
</script>

<style>
.today-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 200rpx;
}
.header {
  background: #fff;
  padding: 32rpx;
  border-bottom: 1rpx solid #eee;
}
.date {
  font-size: 28rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}
.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
}
.start-training {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 60vh;
}
.start-content {
  text-align: center;
}
.start-icon {
  font-size: 120rpx;
  display: block;
  margin-bottom: 32rpx;
}
.start-text {
  font-size: 32rpx;
  color: #666;
  display: block;
  margin-bottom: 48rpx;
}
.start-btn {
  width: 400rpx;
  height: 96rpx;
  background: #333;
  color: #fff;
  font-size: 32rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.stats-bar {
  display: flex;
  background: #fff;
  padding: 24rpx 0;
  margin-bottom: 24rpx;
}
.stat-item {
  flex: 1;
  text-align: center;
}
.stat-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
}
.stat-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-top: 4rpx;
}
.exercise-list {
  padding: 0 24rpx;
}
.action-buttons {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx;
  background: #fff;
  display: flex;
  gap: 24rpx;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
}
.add-exercise-btn {
  flex: 1;
  height: 96rpx;
  background: #f5f5f5;
  color: #333;
  font-size: 32rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.finish-btn {
  flex: 1;
  height: 96rpx;
  background: #333;
  color: #fff;
  font-size: 32rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* Exercise picker */
.picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 100;
  display: flex;
  align-items: flex-end;
}
.picker-sheet {
  width: 100%;
  height: 70vh;
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  display: flex;
  flex-direction: column;
}
.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid #eee;
}
.picker-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}
.picker-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
.picker-close text {
  font-size: 48rpx;
  color: #999;
  line-height: 1;
}
.picker-search {
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #eee;
}
.search-input {
  width: 100%;
  height: 72rpx;
  background: #f5f5f5;
  border-radius: 36rpx;
  padding: 0 32rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}
.picker-list {
  flex: 1;
  padding: 16rpx 0;
}
.picker-item {
  padding: 24rpx 32rpx;
  border-bottom: 1rpx solid #f0f0f0;
}
.picker-item-name {
  font-size: 30rpx;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}
.picker-item-muscles {
  font-size: 24rpx;
  color: #999;
}
/* Summary modal */
.summary-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}
.summary-modal {
  width: 600rpx;
  background: #fff;
  border-radius: 24rpx;
  padding: 48rpx;
  text-align: center;
}
.summary-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 48rpx;
}
.summary-stats {
  display: flex;
  margin-bottom: 48rpx;
}
.summary-stat {
  flex: 1;
  text-align: center;
}
.summary-stat-value {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  display: block;
}
.summary-stat-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-top: 8rpx;
}
.summary-btn {
  width: 100%;
  height: 96rpx;
  background: #333;
  color: #fff;
  font-size: 32rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>