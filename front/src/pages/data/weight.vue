<template>
  <view class="container">
    <!-- 图表区 -->
    <view class="card">
      <view class="card-header">
        <text class="card-title">体重趋势</text>
        <view class="range-tabs">
          <text
            v-for="r in ranges"
            :key="r.days"
            :class="['tab', { active: currentRange === r.days }]"
            @tap="changeRange(r.days)"
          >{{ r.label }}</text>
        </view>
      </view>
      <LineChart
        canvas-id="weight-chart"
        :data="chartData"
        unit="kg"
        :height="400"
        :show-avg="true"
      />
      <view class="legend">
        <view class="legend-item">
          <view class="dot solid" />
          <text>体重</text>
        </view>
        <view class="legend-item">
          <view class="dot dashed" />
          <text>7日均值</text>
        </view>
      </view>
    </view>

    <!-- 记录列表 -->
    <view class="card">
      <text class="card-title">记录列表</text>
      <view v-for="r in records" :key="r.id" class="record-row">
        <text class="record-date">{{ r.recordedAt }}</text>
        <text class="record-value">{{ r.weight }} kg</text>
      </view>
      <view v-if="!records.length" class="empty">暂无记录，点击下方添加</view>
    </view>

    <!-- 输入表单 -->
    <WeightInput @submit="handleSubmit" />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import LineChart from '../../components/charts/LineChart.vue'
import WeightInput from '../../components/forms/WeightInput.vue'
import { getWeightRecords, createWeightRecord } from '../../api/bodyData'
import { useBodyDataStore } from '../../stores/bodyData'
import { today, dateRange } from '../../utils/date'

const store = useBodyDataStore()
const currentRange = ref(30)
const ranges = [
  { label: '周', days: 7 },
  { label: '月', days: 30 },
  { label: '3月', days: 90 },
]

const records = computed(() => store.weightRecords)

const chartData = computed(() =>
  records.value.map((r) => ({
    label: r.recordedAt.slice(5),
    value: r.weight,
    avgValue: r.sevenDayAvg,
  }))
)

async function loadData() {
  const { startDate, endDate } = dateRange(currentRange.value)
  const { records } = await getWeightRecords(startDate, endDate)
  store.setWeightRecords(records)
}

async function changeRange(days: number) {
  currentRange.value = days
  await loadData()
}

async function handleSubmit(weight: number, note: string) {
  await createWeightRecord({ weight, recordedAt: today(), note })
  await loadData()
  uni.showToast({ title: '记录成功', icon: 'success' })
}

onMounted(loadData)
</script>

<style>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.card { background: #fff; border-radius: 24rpx; padding: 32rpx; margin-bottom: 24rpx; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.card-title { font-size: 32rpx; font-weight: bold; color: #333; }
.range-tabs { display: flex; gap: 16rpx; }
.tab { font-size: 24rpx; color: #999; padding: 8rpx 20rpx; border-radius: 32rpx; }
.tab.active { background: #333; color: #fff; }
.legend { display: flex; gap: 32rpx; margin-top: 16rpx; }
.legend-item { display: flex; align-items: center; gap: 8rpx; font-size: 24rpx; color: #999; }
.dot { width: 16rpx; height: 4rpx; }
.dot.solid { background: #333; }
.dot.dashed { background: repeating-linear-gradient(to right, #999 0 4rpx, transparent 4rpx 8rpx); }
.record-row { display: flex; justify-content: space-between; padding: 20rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.record-date { font-size: 28rpx; color: #666; }
.record-value { font-size: 28rpx; font-weight: bold; color: #333; }
.empty { text-align: center; color: #ccc; padding: 40rpx 0; font-size: 28rpx; }
</style>