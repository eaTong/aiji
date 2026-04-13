<template>
  <view class="container">
    <!-- 总览卡片 -->
    <view class="overview-card">
      <view class="overview-item">
        <text class="label">今日体重</text>
        <text class="value">{{ latestWeight ?? '--' }}<text class="unit">kg</text></text>
        <text class="sub" v-if="weightDelta !== null">
          {{ weightDelta > 0 ? '+' : '' }}{{ weightDelta }} kg vs 上周
        </text>
      </view>
    </view>

    <!-- 快速入口 -->
    <view class="entry-grid">
      <view class="entry-item" @tap="goTo('weight')">
        <text class="entry-icon">⚖️</text>
        <text class="entry-label">体重</text>
      </view>
      <view class="entry-item" @tap="goTo('measurements')">
        <text class="entry-icon">📏</text>
        <text class="entry-label">围度</text>
      </view>
      <view class="entry-item" @tap="goTo('photos')">
        <text class="entry-icon">📷</text>
        <text class="entry-label">照片</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getWeightRecords } from '../../api/bodyData'
import { dateRange } from '../../utils/date'

const recentWeights = ref<{ weight: number }[]>([])

const latestWeight = computed(() =>
  recentWeights.value.length
    ? recentWeights.value[recentWeights.value.length - 1].weight
    : null
)

const weightDelta = computed(() => {
  if (recentWeights.value.length < 2) return null
  const latest = recentWeights.value[recentWeights.value.length - 1].weight
  const prev = recentWeights.value[0].weight
  return Math.round((latest - prev) * 10) / 10
})

function goTo(page: string) {
  uni.navigateTo({ url: `/pages/data/${page}` })
}

onMounted(async () => {
  try {
    const { startDate, endDate } = dateRange(7)
    const { records } = await getWeightRecords(startDate, endDate)
    recentWeights.value = records
  } catch {
    // Not logged in yet — ignore
  }
})
</script>

<style>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.overview-card { background: #333; color: #fff; border-radius: 24rpx; padding: 40rpx; margin-bottom: 24rpx; }
.overview-item { display: flex; flex-direction: column; }
.label { font-size: 26rpx; opacity: 0.7; }
.value { font-size: 64rpx; font-weight: bold; margin-top: 8rpx; }
.unit { font-size: 32rpx; }
.sub { font-size: 24rpx; opacity: 0.7; margin-top: 8rpx; }
.entry-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24rpx; }
.entry-item { background: #fff; border-radius: 24rpx; padding: 32rpx; display: flex; flex-direction: column; align-items: center; gap: 16rpx; }
.entry-icon { font-size: 48rpx; }
.entry-label { font-size: 28rpx; color: #333; }
</style>