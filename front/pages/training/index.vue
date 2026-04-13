<template>
  <view class="container">
    <!-- 今日恢复状态 -->
    <RecoveryScore
      :score="recoveryScore"
      :recommendation="recommendation"
      :sleep-hours="sleepHours"
      :editable="true"
      @sleep="onSleepInput"
    />

    <!-- 快捷操作 -->
    <view class="quick-actions">
      <view class="action-card" @tap="goToday">
        <text class="action-icon">💪</text>
        <text class="action-label">今日训练</text>
      </view>
      <view class="action-card" @tap="goRecovery">
        <text class="action-icon">📊</text>
        <text class="action-label">恢复状态</text>
      </view>
      <view class="action-card" @tap="goLibrary">
        <text class="action-icon">📚</text>
        <text class="action-label">动作库</text>
      </view>
    </view>

    <!-- 最近训练 -->
    <view class="recent-card">
      <text class="card-title">最近训练</text>
      <view v-if="recentLogs.length === 0" class="empty">暂无训练记录，开始你的第一次训练吧！</view>
      <view v-for="log in recentLogs" :key="log.id" class="log-item" @tap="goLogDetail(log)">
        <view class="log-info">
          <text class="log-date">{{ formatDate(log.startedAt) }}</text>
          <text class="log-volume">{{ log.totalVolume ?? 0 }}kg</text>
        </view>
        <view class="log-right">
          <text :class="['log-status', log.status.toLowerCase()]">{{ statusLabel(log.status) }}</text>
          <text class="log-arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import RecoveryScore from '../../components/recovery/RecoveryScore.vue'
import { getRecovery, postSleep } from '../../api/recovery'
import { getTrainingLogs } from '../../api/trainingLog'

const recoveryScore = ref(100)
const recommendation = ref<'TRAIN' | 'REST' | 'LIGHT'>('TRAIN')
const sleepHours = ref<number | undefined>()
const recentLogs = ref<any[]>([])

function goToday() {
  uni.navigateTo({ url: '/pages/training/today' })
}

function goRecovery() {
  uni.navigateTo({ url: '/pages/training/recovery' })
}

function goLibrary() {
  uni.navigateTo({ url: '/pages/training/library' })
}

function goLogDetail(log: any) {
  // TODO: Navigate to log detail page
}

function formatDate(dateStr: string): string {
  return dateStr ? dateStr.slice(0, 10).replace(/-/g, '/') : ''
}

function statusLabel(s: string): string {
  return { IN_PROGRESS: '进行中', COMPLETED: '已完成', ABANDONED: '已放弃' }[s] ?? s
}

async function loadRecovery() {
  try {
    const status = await getRecovery()
    recoveryScore.value = status.score
    recommendation.value = status.recommendation
    sleepHours.value = status.sleepHours
  } catch (e) {
    console.error('Failed to load recovery:', e)
  }
}

async function onSleepInput(hours: number) {
  const today = new Date().toISOString().slice(0, 10)
  try {
    await postSleep({ date: today, sleepHours: hours })
    sleepHours.value = hours
    await loadRecovery()
  } catch (e) {
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
}

async function loadRecentLogs() {
  try {
    const logs = (await getTrainingLogs(10, 0)) as any[]
    recentLogs.value = logs.filter((l) => l.status !== 'IN_PROGRESS').slice(0, 5)
  } catch (e) {
    console.error('Failed to load logs:', e)
  }
}

onMounted(() => {
  loadRecovery()
  loadRecentLogs()
})
</script>

<style scoped>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; display: flex; flex-direction: column; gap: 24rpx; }

.quick-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24rpx; }

.action-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 40rpx 20rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.action-icon { font-size: 56rpx; }
.action-label { font-size: 28rpx; color: #333; }

.recent-card { background: #fff; border-radius: 24rpx; padding: 32rpx; }
.card-title { font-size: 32rpx; font-weight: bold; color: #333; display: block; margin-bottom: 24rpx; }
.log-item { display: flex; justify-content: space-between; align-items: center; padding: 24rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.log-info { display: flex; flex-direction: column; gap: 8rpx; }
.log-date { font-size: 28rpx; color: #666; }
.log-volume { font-size: 32rpx; font-weight: bold; color: #333; }
.log-right { display: flex; align-items: center; gap: 12rpx; }
.log-status { font-size: 24rpx; padding: 6rpx 16rpx; border-radius: 12rpx; }
.log-status.completed { background: #e8f5e9; color: #07c160; }
.log-status.abandoned { background: #f5f5f5; color: #999; }
.log-arrow { font-size: 36rpx; color: #ccc; }
.empty { text-align: center; color: #ccc; padding: 60rpx; font-size: 28rpx; }
</style>
