<template>
  <view class="silhouette-container">
    <canvas
      class="body-canvas"
      canvas-id="bodySilhouette"
      :style="{ width: canvasWidth + 'px', height: canvasHeight + 'px' }"
      @tap="onTap"
    />

    <!-- Legend -->
    <view class="legend">
      <view class="legend-item">
        <view class="legend-dot" style="background: #D0D0D0;"></view>
        <text class="legend-text">未录入</text>
      </view>
      <view class="legend-item">
        <view class="legend-dot" style="background: #07c160;"></view>
        <text class="legend-text">已录入</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'

export type PartKey = 'chest' | 'waist' | 'hip' | 'leftArm' | 'rightArm' | 'leftThigh' | 'rightThigh' | 'leftCalf' | 'rightCalf'

// 身体部位定义
interface BodyPart {
  key: PartKey
  path: { x: number; y: number }[]
  bounds: { minX: number; minY: number; maxX: number; maxY: number }
}

const props = defineProps<{
  data?: Partial<Record<PartKey, number>>
}>()

const emit = defineEmits<{
  (e: 'tap', part: PartKey): void
}>()

// Canvas 尺寸
const canvasWidth = 200
const canvasHeight = 420

// 身体部位路径和边界（基于 200x420 的坐标系）
const bodyParts: BodyPart[] = [
  {
    key: 'chest',
    path: [
      { x: 68, y: 62 }, { x: 132, y: 62 },
      { x: 135, y: 105 }, { x: 65, y: 105 }
    ],
    bounds: { minX: 65, minY: 62, maxX: 135, maxY: 105 }
  },
  {
    key: 'waist',
    path: [
      { x: 70, y: 108 }, { x: 130, y: 108 },
      { x: 128, y: 140 }, { x: 72, y: 140 }
    ],
    bounds: { minX: 70, minY: 108, maxX: 130, maxY: 140 }
  },
  {
    key: 'hip',
    path: [
      { x: 72, y: 143 }, { x: 128, y: 143 },
      { x: 125, y: 180 }, { x: 75, y: 180 }
    ],
    bounds: { minX: 72, minY: 143, maxX: 128, maxY: 180 }
  },
  {
    key: 'leftArm',
    path: [
      { x: 48, y: 65 }, { x: 64, y: 62 },
      { x: 60, y: 130 }, { x: 44, y: 125 }
    ],
    bounds: { minX: 44, minY: 62, maxX: 64, maxY: 130 }
  },
  {
    key: 'rightArm',
    path: [
      { x: 136, y: 62 }, { x: 152, y: 65 },
      { x: 156, y: 125 }, { x: 140, y: 130 }
    ],
    bounds: { minX: 136, minY: 62, maxX: 156, maxY: 130 }
  },
  {
    key: 'leftThigh',
    path: [
      { x: 75, y: 183 }, { x: 100, y: 183 },
      { x: 98, y: 270 }, { x: 73, y: 270 }
    ],
    bounds: { minX: 73, minY: 183, maxX: 100, maxY: 270 }
  },
  {
    key: 'rightThigh',
    path: [
      { x: 100, y: 183 }, { x: 125, y: 183 },
      { x: 127, y: 270 }, { x: 102, y: 270 }
    ],
    bounds: { minX: 100, minY: 183, maxX: 127, maxY: 270 }
  },
  {
    key: 'leftCalf',
    path: [
      { x: 73, y: 273 }, { x: 98, y: 273 },
      { x: 95, y: 360 }, { x: 72, y: 360 }
    ],
    bounds: { minX: 72, minY: 273, maxX: 98, maxY: 360 }
  },
  {
    key: 'rightCalf',
    path: [
      { x: 102, y: 273 }, { x: 127, y: 273 },
      { x: 128, y: 360 }, { x: 105, y: 360 }
    ],
    bounds: { minX: 102, minY: 273, maxX: 128, maxY: 360 }
  }
]

function hasData(part: PartKey): boolean {
  return props.data?.[part] !== undefined && props.data?.[part] !== null
}

function isPointInPolygon(x: number, y: number, polygon: { x: number; y: number }[]): boolean {
  let inside = false
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y
    const xj = polygon[j].x, yj = polygon[j].y
    if (((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi)) {
      inside = !inside
    }
  }
  return inside
}

function hitTest(x: number, y: number): PartKey | null {
  // 坐标转换：canvas 坐标到 SVG 坐标
  const scaleX = 200 / canvasWidth
  const scaleY = 420 / canvasHeight
  const svgX = x * scaleX
  const svgY = y * scaleY

  for (const part of bodyParts) {
    if (isPointInPolygon(svgX, svgY, part.path)) {
      return part.key
    }
  }
  return null
}

function onTap(e: any) {
  const { x, y } = e.detail || e
  if (x !== undefined && y !== undefined) {
    const part = hitTest(x, y)
    if (part) {
      emit('tap', part)
    }
  }
}

function draw() {
  const ctx = uni.createCanvasContext('bodySilhouette')

  // 清空画布
  ctx.clearRect(0, 0, canvasWidth, canvasHeight)

  // 绘制头部（用圆形代替椭圆，微信小程序不支持 ellipse）
  ctx.beginPath()
  ctx.arc(100, 30, 18, 0, 2 * Math.PI)
  ctx.setFillStyle('#ccc')
  ctx.fill()

  // 绘制颈部（用矩形）
  ctx.beginPath()
  ctx.rect(92, 48, 16, 14)
  ctx.setFillStyle('#ccc')
  ctx.fill()

  // 绘制身体部位
  for (const part of bodyParts) {
    const filled = hasData(part.key)
    ctx.beginPath()
    ctx.moveTo(part.path[0].x, part.path[0].y)
    for (let i = 1; i < part.path.length; i++) {
      ctx.lineTo(part.path[i].x, part.path[i].y)
    }
    ctx.closePath()
    ctx.setFillStyle(filled ? '#07c160' : '#D0D0D0')
    ctx.fill()

    // 如果有数据，在部位中心显示数值
    if (filled && props.data?.[part.key] !== undefined) {
      ctx.setFontSize(10)
      ctx.setFillStyle('#fff')
      ctx.setTextAlign('center')
      ctx.setTextBaseline('middle')
      const centerX = (part.bounds.minX + part.bounds.maxX) / 2
      const centerY = (part.bounds.minY + part.bounds.maxY) / 2
      ctx.fillText(String(props.data[part.key]), centerX, centerY)
    }
  }

  ctx.draw()
}

// 监听数据变化，重新绘制
watch(() => props.data, draw, { deep: true })

onMounted(() => {
  draw()
})
</script>

<style scoped>
.silhouette-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx;
}

.body-canvas {
  display: block;
}

.legend {
  display: flex;
  flex-direction: row;
  gap: 32rpx;
  margin-top: 24rpx;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.legend-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}

.legend-text {
  font-size: 24rpx;
  color: #666;
}
</style>
