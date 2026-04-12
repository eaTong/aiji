<template>
  <view class="chart-wrapper">
    <canvas
      type="2d"
      :canvas-id="canvasId"
      :style="{ width: '100%', height: height + 'rpx' }"
    />
  </view>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'

interface DataPoint {
  label: string
  value: number
  avgValue?: number
}

const props = withDefaults(
  defineProps<{
    canvasId: string
    data: DataPoint[]
    unit?: string
    height?: number
    showAvg?: boolean
  }>(),
  { unit: 'kg', height: 400, showAvg: true }
)

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
      const min = Math.min(...values) - 1
      const max = Math.max(...values) + 1
      const scaleX = (i: number) =>
        pad.left + (i / Math.max(props.data.length - 1, 1)) * w
      const scaleY = (v: number) =>
        pad.top + h - ((v - min) / (max - min)) * h

      // 背景网格
      ctx.strokeStyle = '#f0f0f0'
      ctx.lineWidth = 1
      for (let i = 0; i <= 4; i++) {
        const y = pad.top + (i / 4) * h
        ctx.beginPath()
        ctx.moveTo(pad.left, y)
        ctx.lineTo(pad.left + w, y)
        ctx.stroke()
      }

      // Y 轴标签
      ctx.fillStyle = '#999'
      ctx.font = '20rpx'
      ctx.textAlign = 'right'
      for (let i = 0; i <= 4; i++) {
        const v = min + ((max - min) / 4) * (4 - i)
        const y = pad.top + (i / 4) * h
        ctx.fillText(v.toFixed(1), pad.left - 8, y + 6)
      }

      // 主折线
      ctx.beginPath()
      ctx.strokeStyle = '#333'
      ctx.lineWidth = 3
      props.data.forEach((d, i) => {
        i === 0
          ? ctx.moveTo(scaleX(i), scaleY(d.value))
          : ctx.lineTo(scaleX(i), scaleY(d.value))
      })
      ctx.stroke()

      // 数据点
      props.data.forEach((d, i) => {
        ctx.beginPath()
        ctx.arc(scaleX(i), scaleY(d.value), 4, 0, Math.PI * 2)
        ctx.fillStyle = '#333'
        ctx.fill()
      })

      // 7日均值虚线
      if (props.showAvg) {
        ctx.beginPath()
        ctx.strokeStyle = '#999'
        ctx.lineWidth = 2
        ctx.setLineDash([6, 6])
        props.data.forEach((d, i) => {
          if (d.avgValue == null) return
          i === 0
            ? ctx.moveTo(scaleX(i), scaleY(d.avgValue))
            : ctx.lineTo(scaleX(i), scaleY(d.avgValue))
        })
        ctx.stroke()
        ctx.setLineDash([])
      }

      // X 轴标签
      ctx.fillStyle = '#999'
      ctx.font = '18rpx'
      ctx.textAlign = 'center'
      props.data.forEach((d, i) => {
        if (i % Math.max(Math.floor(props.data.length / 5), 1) !== 0) return
        ctx.fillText(d.label, scaleX(i), height - 8)
      })
    })
}

onMounted(drawChart)
watch(() => props.data, drawChart, { deep: true })
</script>

<style>
.chart-wrapper { width: 100%; }
</style>