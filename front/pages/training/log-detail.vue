<template>
  <view class="container">
    <view v-if="loading" class="loading">加载中...</view>
    <view v-else-if="!log" class="empty">
      <text>训练记录不存在</text>
    </view>
    <view v-else class="log-detail">
      <!-- 头部信息 -->
      <view class="header-card">
        <view class="header-main">
          <text class="log-date">{{ formatDate(log.startedAt) }}</text>
          <text :class="['log-status', log.status.toLowerCase()]">{{ statusLabel(log.status) }}</text>
        </view>
        <view class="header-stats">
          <view class="stat-item">
            <text class="stat-value">{{ log.totalVolume ?? 0 }}</text>
            <text class="stat-label">总容量(kg)</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ formatDuration(log.duration) }}</text>
            <text class="stat-label">训练时长</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ log.logEntries.length }}</text>
            <text class="stat-label">总组数</text>
          </view>
        </view>
      </view>

      <!-- 动作列表 -->
      <view class="exercises-card">
        <text class="card-title">训练动作</text>
        <view v-for="(exercise, idx) in groupedEntries" :key="idx" class="exercise-item">
          <view class="exercise-header">
            <text class="exercise-name">{{ exercise.name }}</text>
          </view>
          <view class="sets-table">
            <view class="set-header">
              <text class="set-col">组</text>
              <text class="set-col">重量</text>
              <text class="set-col">次数</text>
              <text class="set-col">E1RM</text>
            </view>
            <view
              v-for="(entry, setIdx) in exercise.entries"
              :key="entry.id"
              :class="['set-row', { warmup: entry.isWarmup }]"
            >
              <text class="set-col">{{ setIdx + 1 }}</text>
              <text class="set-col">{{ entry.weight }}kg</text>
              <text class="set-col">{{ entry.reps }}</text>
              <text class="set-col">{{ entry.e1rm ? entry.e1rm.toFixed(1) : '-' }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getTrainingLog, type TrainingLog, type TrainingLogEntry } from '../../api/trainingLog'

interface RouteParams {
  id: string
}

const log = ref<(TrainingLog & { logEntries: TrainingLogEntry[] }) | null>(null)
const loading = ref(true)

const groupedEntries = computed(() => {
  if (!log.value?.logEntries) return []

  const groups: Record<string, { name: string; entries: TrainingLogEntry[] }> = {}

  for (const entry of log.value.logEntries) {
    if (!groups[entry.exerciseName]) {
      groups[entry.exerciseName] = { name: entry.exerciseName, entries: [] }
    }
    groups[entry.exerciseName].entries.push(entry)
  }

  return Object.values(groups)
})

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '-'
  const mins = Math.floor(seconds / 60)
  return `${mins}分钟`
}

function statusLabel(s: string): string {
  return { IN_PROGRESS: '进行中', COMPLETED: '已完成', ABANDONED: '已放弃' }[s] ?? s
}

async function loadLog() {
  loading.value = true
  try {
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1] as any
    const options = currentPage.options || {}
    const logId = options.id

    if (logId) {
      log.value = await getTrainingLog(logId)
    }
  } catch (e) {
    console.error('加载训练记录失败', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadLog()
})
</script>

<style scoped>
.container {
  padding: 24rpx;
  background: #f5f5f5;
  min-height: 100vh;
}

.loading,
.empty {
  text-align: center;
  padding: 100rpx;
  color: #999;
  font-size: 28rpx;
}

.header-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.log-date {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.log-status {
  font-size: 24rpx;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
}

.log-status.completed {
  background: #e8f5e9;
  color: #07c160;
}

.log-status.in_progress {
  background: #fff3e0;
  color: #ff9800;
}

.log-status.abandoned {
  background: #f5f5f5;
  color: #999;
}

.header-stats {
  display: flex;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #07c160;
}

.stat-label {
  font-size: 24rpx;
  color: #999;
  margin-top: 8rpx;
}

.exercises-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 24rpx;
}

.exercise-item {
  margin-bottom: 32rpx;
}

.exercise-item:last-child {
  margin-bottom: 0;
}

.exercise-header {
  margin-bottom: 16rpx;
}

.exercise-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.sets-table {
  background: #f8f8f8;
  border-radius: 16rpx;
  overflow: hidden;
}

.set-header {
  display: flex;
  padding: 16rpx 20rpx;
  background: #f0f0f0;
}

.set-header .set-col {
  font-size: 24rpx;
  color: #666;
  font-weight: 600;
}

.set-row {
  display: flex;
  padding: 16rpx 20rpx;
  border-bottom: 1rpx solid #eee;
}

.set-row:last-child {
  border-bottom: none;
}

.set-row.warmup {
  background: #fff8e1;
}

.set-col {
  flex: 1;
  text-align: center;
  font-size: 26rpx;
  color: #333;
}
</style>
