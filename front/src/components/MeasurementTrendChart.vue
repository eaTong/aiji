<template>
  <view class="chart-container">
    <view class="chart-header">
      <text class="chart-title">{{ title }}</text>
      <text class="chart-unit">单位：cm</text>
    </view>
    <view class="canvas-wrapper">
      <canvas
        type="2d"
        :canvas-id="canvasId"
        :style="{ width: '100%', height: '300rpx' }"
      />
      <view v-if="!data.length" class="no-data-overlay">
        <text>暂无数据</text>
      </view>
    </view>
    <view v-if="data.length" class="stats-footer">
      <view class="stat-item">
        <text class="stat-label">最新</text>
        <text class="stat-value">{{ latest }} cm</text>
      </view>
      <view class="stat-item">
        <text class="stat-label">最高</text>
        <text class="stat-value">{{ maxVal }} cm</text>
      </view>
      <view class="stat-item">
        <text class="stat-label">最低</text>
        <text class="stat-value">{{ minVal }} cm</text>
      </view>
      <view class="stat-item">
        <text class="stat-label">变化</text>
        <text class="stat-value" :class="deltaClass">{{ deltaText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onMounted, watch, computed } from 'vue'

export interface DataPoint {
  date: string
  value: number
}

const props = withDefaults(
  defineProps<{
    canvasId: string
    title: string
    data: DataPoint[]
  }>(),
  {}
)

// Statistics
const latest = computed(() =>
  props.data.length ? props.data[props.data.length - 1].value.toFixed(1) : '0.0'
)

const maxVal = computed(() =>
  props.data.length ? Math.max(...props.data.map((d) => d.value)).toFixed(1) : '0.0'
)

const minVal = computed(() =>
  props.data.length ? Math.min(...props.data.map((d) => d.value)).toFixed(1) : '0.0'
)

const delta = computed(() => {
  if (props.data.length < 2) return 0
  return props.data[props.data.length - 1].value - props.data[0].value
})

const deltaText = computed(() => {
  const d = delta.value
  if (d === 0) return '0.0'
  return d > 0 ? `+${d.toFixed(1)}` : d.toFixed(1)
})

const deltaClass = computed(() => {
  const d = delta.value
  if (d > 0) return 'delta-positive'
  if (d < 0) return 'delta-negative'
  return 'delta-same'
})

function formatDate(dateStr: string): string {
  // dateStr format: YYYY-MM-DD
  const parts = dateStr.split('-')
  if (parts.length >= 2) {
    return `${parts[1]}-${parts[2]}`
  }
  return dateStr
}

function drawChart() {
  if (!props.data.length) return

  const query = uni.createSelectorQuery()
  query
    .select(`#${props.canvasId}`)
    .fields({ node: true, size: true })
    .exec((res: any[]) => {
      if (!res[0]?.node) return
      const canvas = res[0].node as HTMLCanvasElement
      const ctx = canvas.getContext('2d')!
      const { width, height } = res[0]
      const dpr = uni.getSystemInfoSync().pixelRatio
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)

      const pad = { top: 20, right: 20, bottom: 40, left: 50 }
      const w = width - pad.left - pad.right
      const h = height - pad.top - pad.bottom
      const values = props.data.map((d) => d.value)
      const dataMin = Math.min(...values)
      const dataMax = Math.max(...values)
      const padding = 2 // 2cm padding
      const min = dataMin - padding
      const max = dataMax + padding

      const scaleX = (i: number) =>
        pad.left + (i / Math.max(props.data.length - 1, 1)) * w
      const scaleY = (v: number) =>
        pad.top + h - ((v - min) / (max - min)) * h

      // Grid lines (4 horizontal)
      ctx.strokeStyle = '#e0e0e0'
      ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + (i / 4) * h
        ctx.beginPath()
        ctx.moveTo(pad.left, y)
        ctx.lineTo(pad.left + w, y)
        ctx.stroke()
      }

      // Y axis labels
      ctx.fillStyle = '#999'
      ctx.font = '20rpx'
      ctx.textAlign = 'right'
      for (let i = 0; i <= 4; i++) {
        const v = min + ((max - min) / 4) * (4 - i)
        const y = pad.top + (i / 4) * h
        ctx.fillText(v.toFixed(1), pad.left - 8, y + 6)
      }

      // Main line (2px, dark #333)
      ctx.beginPath()
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'
      props.data.forEach((d, i) => {
        const x = scaleX(i)
        const y = scaleY(d.value)
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
      })
      ctx.stroke()

      // Data points (filled circles, r=4, #333)
      props.data.forEach((d, i) => {
        ctx.beginPath()
        ctx.arc(scaleX(i), scaleY(d.value), 4, 0, Math.PI * 2)
        ctx.fillStyle = '#333'
        ctx.fill()
      })

      // X axis date labels (MM-DD, ~5 evenly-spaced)
      ctx.fillStyle = '#999'
      ctx.font = '18rpx'
      ctx.textAlign = 'center'
      const labelCount = Math.min(props.data.length, 5)
      const step = Math.max(Math.floor(props.data.length / labelCount), 1)
      for (let i = 0; i < props.data.length; i += step) {
        const x = scaleX(i)
        const y = height - 8
        ctx.fillText(formatDate(props.data[i].date), x, y)
      }
      // Always show last label if not already covered
      const lastIdx = props.data.length - 1
      if (lastIdx % step !== 0 || props.data.length <= labelCount) {
        ctx.fillText(formatDate(props.data[lastIdx].date), scaleX(lastIdx), height - 8)
      }
    })
}

onMounted(drawChart)
watch(() => props.data, drawChart, { deep: true })
</script>

<style scoped>
.chart-container {
  width: 100%;
  background: #fff;
  padding: 0;
}

.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 20rpx 8rpx;
}

.chart-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.chart-unit {
  font-size: 22rpx;
  color: #999;
}

.canvas-wrapper {
  position: relative;
  width: 100%;
}

.no-data-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: rgba(255, 255, 255, 0.9);
  z-index: 1;
}

.no-data-overlay text {
  font-size: 26rpx;
  color: #999;
}

.stats-footer {
  display: flex;
  justify-content: space-around;
  padding: 16rpx 20rpx 20rpx;
  border-top: 1rpx solid #f0f0f0;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4rpx;
}

.stat-label {
  font-size: 22rpx;
  color: #999;
}

.stat-value {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.delta-positive {
  color: #ff7f50;
}

.delta-negative {
  color: #32cd32;
}

.delta-same {
  color: #999;
}
</style>
