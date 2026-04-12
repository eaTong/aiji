# Phase 1 补充：围度记录 UI 改进 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended)

**Goal:** 围度记录页面增加人体轮廓可视化交互 + 各部位围度趋势图，替代原有的纯表单列表。

**Architecture:** 前端 uni-app + Vue3，使用 SVG 绘制人体轮廓，点击热区触发 popup 录入框，使用 Canvas 2D 绘制各部位趋势图。

---

## 文件结构

### 新增组件

```
front/src/components/
├── BodySilhouette.vue          # 人体轮廓 SVG 组件（可点击部位）
├── MeasurementPopup.vue        # 围度录入弹窗
└── MeasurementTrendChart.vue   # 围度趋势图（单部位折线图）
```

### 修改页面

```
front/src/pages/data/measurements.vue   # 重构为「轮廓 + 弹窗 + 趋势图」模式
```

---

## Task 1: 人体轮廓 SVG 组件

**Files:**
- Create: `front/src/components/BodySilhouette.vue`

### 人体轮廓可点击部位（正面视图）

| 部位 | SVG 热区 ID | 颜色状态 |
|------|------------|---------|
| 胸围 | `chest` | 无数据: #E0E0E0 / 有数据: #333 |
| 腰围 | `waist` | 无数据: #E0E0E0 / 有数据: #333 |
| 臀围 | `hip` | 无数据: #E0E0E0 / 有数据: #333 |
| 左臂 | `leftArm` | 无数据: #E0E0E0 / 有数据: #333 |
| 右臂 | `rightArm` | 无数据: #E0E0E0 / 有数据: #333 |
| 左大腿 | `leftThigh` | 无数据: #E0E0E0 / 有数据: #333 |
| 右大腿 | `rightThigh` | 无数据: #E0E0E0 / 有数据: #333 |
| 左小腿 | `leftCalf` | 无数据: #E0E0E0 / 有数据: #333 |
| 右小腿 | `rightCalf` | 无数据: #E0E0E0 / 有数据: #333 |

### SVG 轮廓设计（正面视图，宽度 200rpx，高度 400rpx）

```vue
<template>
  <view class="silhouette-wrapper">
    <svg
      viewBox="0 0 200 400"
      class="silhouette-svg"
      xmlns="http://www.w3.org/2000/svg"
    >
      <!-- 头部 -->
      <ellipse cx="100" cy="30" rx="20" ry="25" fill="#E0E0E0" />

      <!-- 颈部 -->
      <rect x="92" y="52" width="16" height="15" fill="#E0E0E0" />

      <!-- 躯干轮廓 -->
      <path
        d="M60 67 L140 67 L150 120 L145 200 L130 200 L130 210 L70 210 L70 200 L55 200 L50 120 Z"
        fill="#E0E0E0"
        stroke="#ccc"
        stroke-width="1"
      />

      <!-- 胸部热区 -->
      <path
        id="chest"
        d="M65 75 L135 75 L140 110 L60 110 Z"
        :fill="fillColor('chest')"
        class="hotspot"
        @tap="onTap('chest')"
      />

      <!-- 腰部热区 -->
      <path
        id="waist"
        d="M62 130 L138 130 L142 160 L58 160 Z"
        :fill="fillColor('waist')"
        class="hotspot"
        @tap="onTap('waist')"
      />

      <!-- 臀部热区 -->
      <path
        id="hip"
        d="M58 165 L142 165 L140 200 L60 200 Z"
        :fill="fillColor('hip')"
        class="hotspot"
        @tap="onTap('hip')"
      />

      <!-- 左臂 -->
      <path
        id="leftArm"
        d="M60 70 L45 72 L30 130 L25 190 L40 192 L50 135 L55 75 Z"
        :fill="fillColor('leftArm')"
        class="hotspot"
        @tap="onTap('leftArm')"
      />

      <!-- 右臂 -->
      <path
        id="rightArm"
        d="M140 70 L155 72 L170 130 L175 190 L160 192 L150 135 L145 75 Z"
        :fill="fillColor('rightArm')"
        class="hotspot"
        @tap="onTap('rightArm')"
      />

      <!-- 左大腿 -->
      <path
        id="leftThigh"
        d="M70 210 L85 210 L80 290 L65 290 Z"
        :fill="fillColor('leftThigh')"
        class="hotspot"
        @tap="onTap('leftThigh')"
      />

      <!-- 右大腿 -->
      <path
        id="rightThigh"
        d="M115 210 L130 210 L135 290 L120 290 Z"
        :fill="fillColor('rightThigh')"
        class="hotspot"
        @tap="onTap('rightThigh')"
      />

      <!-- 左小腿 -->
      <path
        id="leftCalf"
        d="M65 295 L80 295 L78 370 L63 370 Z"
        :fill="fillColor('leftCalf')"
        class="hotspot"
        @tap="onTap('leftCalf')"
      />

      <!-- 右小腿 -->
      <path
        id="rightCalf"
        d="M120 295 L135 295 L137 370 L122 370 Z"
        :fill="fillColor('rightCalf')"
        class="hotspot"
        @tap="onTap('rightCalf')"
      />

      <!-- 脚部 -->
      <ellipse cx="72" cy="380" rx="15" ry="8" fill="#E0E0E0" />
      <ellipse cx="128" cy="380" rx="15" ry="8" fill="#E0E0E0" />
    </svg>

    <!-- 部位标签 -->
    <view class="label-row" v-for="part in labelParts" :key="part.id">
      <text
        class="part-label"
        :style="{ top: part.top + 'rpx', left: part.left + 'rpx' }"
        @tap="onTap(part.id)"
      >{{ part.label }}</text>
    </view>
  </view>
</template>
```

### 完整实现逻辑

- [ ] **Step 1: 创建 `BodySilhouette.vue`**

```vue
<template>
  <view class="silhouette-container">
    <view class="silhouette-title">点击身体部位记录围度</view>
    <view class="svg-area">
      <svg
        viewBox="0 0 200 420"
        class="body-svg"
        xmlns="http://www.w3.org/2000/svg"
      >
        <!-- 头部 -->
        <ellipse cx="100" cy="28" rx="22" ry="26" fill="#E8E8E8" />

        <!-- 颈部 -->
        <rect x="91" y="52" width="18" height="14" fill="#E8E8E8" />

        <!-- 躯干 -->
        <path
          d="M58 66 L142 66 L152 125 L148 205 L132 205 L132 215 L68 215 L68 205 L52 205 L48 125 Z"
          fill="#E8E8E8"
        />

        <!-- 左臂 -->
        <path
          d="M58 68 L42 72 L25 135 L20 200 L38 203 L48 140 L56 76 Z"
          fill="#E8E8E8"
        />

        <!-- 右臂 -->
        <path
          d="M142 68 L158 72 L175 135 L180 200 L162 203 L152 140 L144 76 Z"
          fill="#E8E8E8"
        />

        <!-- 左大腿 -->
        <path
          d="M68 218 L88 218 L82 305 L68 305 Z"
          fill="#E8E8E8"
        />

        <!-- 右大腿 -->
        <path
          d="M112 218 L132 218 L132 305 L118 305 Z"
          fill="#E8E8E8"
        />

        <!-- 左小腿 -->
        <path
          d="M68 310 L82 310 L80 390 L66 390 Z"
          fill="#E8E8E8"
        />

        <!-- 右小腿 -->
        <path
          d="M118 310 L132 310 L134 390 L120 390 Z"
          fill="#E8E8E8"
        />

        <!-- 热区：胸 -->
        <path
          d="M63 72 L137 72 L143 118 L57 118 Z"
          :fill="data.chest ? '#333' : '#D0D0D0'"
          class="hotspot"
          @tap="emit('tap', 'chest')"
        />
        <text x="100" y="100" class="hotspot-label">胸</text>

        <!-- 热区：腰 -->
        <path
          d="M60 132 L140 132 L144 168 L56 168 Z"
          :fill="data.waist ? '#333' : '#D0D0D0'"
          class="hotspot"
          @tap="emit('tap', 'waist')"
        />
        <text x="100" y="155" class="hotspot-label">腰</text>

        <!-- 热区：臀 -->
        <path
          d="M54 172 L146 172 L144 208 L56 208 Z"
          :fill="data.hip ? '#333' : '#D0D0D0'"
          class="hotspot"
          @tap="emit('tap', 'hip')"
        />
        <text x="100" y="195" class="hotspot-label">臀</text>

        <!-- 热区：左臂 -->
        <path
          d="M40 78 L55 75 L18 142 L10 202 L30 206 L42 148 L50 86 Z"
          :fill="data.leftArm ? '#333' : '#D0D0D0'"
          class="hotspot"
          @tap="emit('tap', 'leftArm')"
        />

        <!-- 热区：右臂 -->
        <path
          d="M160 78 L145 75 L182 142 L190 202 L170 206 L158 148 L150 86 Z"
          :fill="data.rightArm ? '#333' : '#D0D0D0'"
          class="hotspot"
          @tap="emit('tap', 'rightArm')"
        />

        <!-- 热区：左大腿 -->
        <path
          d="M68 218 L88 218 L82 305 L68 305 Z"
          :fill="data.leftThigh ? '#333' : '#D0D0D0'"
          class="hotspot"
          @tap="emit('tap', 'leftThigh')"
        />
        <text x="76" y="265" class="hotspot-label-sm">左腿</text>

        <!-- 热区：右大腿 -->
        <path
          d="M112 218 L132 218 L132 305 L118 305 Z"
          :fill="data.rightThigh ? '#333' : '#D0D0D0'"
          class="hotspot"
          @tap="emit('tap', 'rightThigh')"
        />
        <text x="120" y="265" class="hotspot-label-sm">右腿</text>

        <!-- 热区：左小腿 -->
        <path
          d="M68 310 L82 310 L80 390 L66 390 Z"
          :fill="data.leftCalf ? '#333' : '#D0D0D0'"
          class="hotspot"
          @tap="emit('tap', 'leftCalf')"
        />

        <!-- 热区：右小腿 -->
        <path
          d="M118 310 L132 310 L134 390 L120 390 Z"
          :fill="data.rightCalf ? '#333' : '#D0D0D0'"
          class="hotspot"
          @tap="emit('tap', 'rightCalf')"
        />
      </svg>
    </view>

    <!-- 图例 -->
    <view class="legend">
      <view class="legend-item">
        <view class="legend-dot empty" />
        <text>未录入</text>
      </view>
      <view class="legend-item">
        <view class="legend-dot filled" />
        <text>已录入</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
interface MeasurementData {
  chest?: number
  waist?: number
  hip?: number
  leftArm?: number
  rightArm?: number
  leftThigh?: number
  rightThigh?: number
  leftCalf?: number
  rightCalf?: number
}

const props = defineProps<{
  data: Partial<MeasurementData>
}>()

const emit = defineEmits<{
  (e: 'tap', part: keyof MeasurementData): void
}>()
</script>

<style scoped>
.silhouette-container {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
}
.silhouette-title {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 24rpx;
}
.svg-area {
  width: 320rpx;
  height: 680rpx;
}
.body-svg {
  width: 100%;
  height: 100%;
}
.hotspot {
  cursor: pointer;
  transition: fill 0.2s;
}
.hotspot:active {
  opacity: 0.7;
}
.hotspot-label {
  font-size: 12px;
  fill: #fff;
  text-anchor: middle;
  pointer-events: none;
}
.hotspot-label-sm {
  font-size: 10px;
  fill: #fff;
  text-anchor: middle;
  pointer-events: none;
}
.legend {
  display: flex;
  gap: 32rpx;
  margin-top: 24rpx;
}
.legend-item {
  display: flex;
  align-items: center;
  gap: 8rpx;
  font-size: 24rpx;
  color: #999;
}
.legend-dot {
  width: 20rpx;
  height: 20rpx;
  border-radius: 4rpx;
}
.legend-dot.empty {
  background: #D0D0D0;
}
.legend-dot.filled {
  background: #333;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add front/src/components/BodySilhouette.vue
git commit -m "feat: 添加人体轮廓 SVG 组件（可点击部位）"
```

---

## Task 2: 围度录入弹窗组件

**Files:**
- Create: `front/src/components/MeasurementPopup.vue`

- [ ] **Step 1: 创建 `MeasurementPopup.vue`**

```vue
<template>
  <view v-if="visible" class="popup-mask" @tap="onClose">
    <view class="popup-card" @tap.stop>
      <view class="popup-header">
        <text class="popup-title">{{ partConfig.title }}</text>
        <text class="popup-subtitle">{{ partConfig.subtitle }}</text>
      </view>

      <view class="current-value" v-if="currentValue">
        <text class="current-label">上次记录</text>
        <text class="current-num">{{ currentValue }}</text>
        <text class="current-unit">cm</text>
      </view>

      <view class="input-area">
        <input
          type="digit"
          v-model="inputValue"
          :placeholder="'请输入' + partConfig.title"
          class="value-input"
          @input="onInput"
        />
        <text class="input-unit">cm</text>
      </view>

      <view class="change-info" v-if="changeInfo">
        <text :class="['change-text', changeInfo.type]">
          {{ changeInfo.text }}
        </text>
      </view>

      <view class="popup-actions">
        <button class="btn-cancel" @tap="onClose">取消</button>
        <button class="btn-confirm" @tap="onConfirm" :disabled="!isValid">
          确认
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

type PartKey = 'chest' | 'waist' | 'hip' | 'leftArm' | 'rightArm' | 'leftThigh' | 'rightThigh' | 'leftCalf' | 'rightCalf'

interface PartConfig {
  title: string
  subtitle: string
}

const partConfigs: Record<PartKey, PartConfig> = {
  chest: { title: '胸围', subtitle: '测量胸部最丰满处' },
  waist: { title: '腰围', subtitle: '测量腹部最细处' },
  hip: { title: '臀围', subtitle: '测量臀部最宽处' },
  leftArm: { title: '左臂围', subtitle: '测量左臂肱三头肌最粗处' },
  rightArm: { title: '右臂围', subtitle: '测量右臂肱三头肌最粗处' },
  leftThigh: { title: '左大腿围', subtitle: '测量左大腿最粗处' },
  rightThigh: { title: '右大腿围', subtitle: '测量右大腿最粗处' },
  leftCalf: { title: '左小腿围', subtitle: '测量左小腿最粗处' },
  rightCalf: { title: '右小腿围', subtitle: '测量右小腿最粗处' },
}

const props = defineProps<{
  visible: boolean
  part: PartKey | null
  currentValue?: number
  previousValue?: number
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'confirm', value: number): void
}>()

const inputValue = ref('')

watch(() => props.visible, (v) => {
  if (!v) inputValue.value = ''
})

const partConfig = computed(() => props.part ? partConfigs[props.part] : { title: '', subtitle: '' })

const isValid = computed(() => {
  const v = parseFloat(inputValue.value)
  return !isNaN(v) && v > 30 && v < 200
})

const changeInfo = computed(() => {
  if (!props.currentValue || !inputValue.value) return null
  const curr = parseFloat(inputValue.value)
  if (isNaN(curr)) return null
  const delta = curr - props.currentValue
  if (Math.abs(delta) < 0.1) return null
  const sign = delta > 0 ? '+' : ''
  return {
    type: delta > 0 ? 'increase' : 'decrease',
    text: `较上次${sign}${delta.toFixed(1)}cm`,
  }
})

function onInput() {
  inputValue.value = inputValue.value.replace(/[^\d.]/g, '')
}

function onClose() {
  emit('close')
}

function onConfirm() {
  if (!isValid.value) return
  emit('confirm', parseFloat(inputValue.value))
}
</script>

<style scoped>
.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: flex-end;
  justify-content: center;
  z-index: 999;
}
.popup-card {
  background: #fff;
  border-radius: 32rpx 32rpx 0 0;
  padding: 48rpx 40rpx 60rpx;
  width: 100%;
  max-width: 750rpx;
}
.popup-header {
  text-align: center;
  margin-bottom: 40rpx;
}
.popup-title {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  display: block;
}
.popup-subtitle {
  font-size: 26rpx;
  color: #999;
  margin-top: 8rpx;
  display: block;
}
.current-value {
  display: flex;
  align-items: baseline;
  justify-content: center;
  gap: 8rpx;
  margin-bottom: 32rpx;
}
.current-label {
  font-size: 26rpx;
  color: #999;
}
.current-num {
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
}
.current-unit {
  font-size: 28rpx;
  color: #666;
}
.input-area {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  margin-bottom: 24rpx;
}
.value-input {
  font-size: 72rpx;
  font-weight: bold;
  text-align: center;
  width: 300rpx;
  border-bottom: 4rpx solid #333;
  padding: 16rpx 0;
}
.input-unit {
  font-size: 36rpx;
  color: #666;
}
.change-info {
  text-align: center;
  margin-bottom: 32rpx;
}
.change-text {
  font-size: 28rpx;
  padding: 8rpx 24rpx;
  border-radius: 20rpx;
}
.change-text.increase {
  color: #f60;
  background: rgba(255,102,0,0.1);
}
.change-text.decrease {
  color: #07c160;
  background: rgba(7,193,96,0.1);
}
.popup-actions {
  display: flex;
  gap: 24rpx;
}
.btn-cancel, .btn-confirm {
  flex: 1;
  height: 96rpx;
  line-height: 96rpx;
  border-radius: 48rpx;
  font-size: 32rpx;
}
.btn-cancel {
  background: #f5f5f5;
  color: #666;
}
.btn-confirm {
  background: #333;
  color: #fff;
}
.btn-confirm[disabled] {
  background: #ccc;
  color: #fff;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add front/src/components/MeasurementPopup.vue
git commit -m "feat: 添加围度录入弹窗组件"
```

---

## Task 3: 围度趋势图组件

**Files:**
- Create: `front/src/components/MeasurementTrendChart.vue`

- [ ] **Step 1: 创建 `MeasurementTrendChart.vue`**

```vue
<template>
  <view class="trend-chart">
    <view class="chart-header">
      <text class="chart-title">{{ title }}</text>
      <text class="chart-unit">单位：cm</text>
    </view>
    <view class="chart-body">
      <canvas
        type="2d"
        :id="canvasId"
        :style="{ width: '100%', height: '300rpx' }"
      />
    </view>
    <view class="chart-footer">
      <view class="stat-item">
        <text class="stat-label">最新</text>
        <text class="stat-value">{{ latest ?? '--' }} <text class="stat-unit">cm</text></text>
      </view>
      <view class="stat-item">
        <text class="stat-label">最高</text>
        <text class="stat-value">{{ maxVal ?? '--' }} <text class="stat-unit">cm</text></text>
      </view>
      <view class="stat-item">
        <text class="stat-label">最低</text>
        <text class="stat-value">{{ minVal ?? '--' }} <text class="stat-unit">cm</text></text>
      </view>
      <view class="stat-item">
        <text class="stat-label">变化</text>
        <text :class="['stat-value', changeClass]">{{ changeText }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'

interface DataPoint {
  date: string
  value: number
}

const props = withDefaults(defineProps<{
  canvasId: string
  title: string
  data: DataPoint[]
}>(), {
  canvasId: 'measurement-chart',
  title: '',
  data: () => [],
})

const latest = computed(() => {
  if (!props.data.length) return null
  return props.data[props.data.length - 1].value.toFixed(1)
})

const maxVal = computed(() => {
  if (!props.data.length) return null
  return Math.max(...props.data.map(d => d.value)).toFixed(1)
})

const minVal = computed(() => {
  if (!props.data.length) return null
  return Math.min(...props.data.map(d => d.value)).toFixed(1)
})

const changeText = computed(() => {
  if (props.data.length < 2) return '--'
  const first = props.data[0].value
  const last = props.data[props.data.length - 1].value
  const delta = last - first
  const sign = delta > 0 ? '+' : ''
  return `${sign}${delta.toFixed(1)}`
})

const changeClass = computed(() => {
  if (props.data.length < 2) return ''
  const delta = props.data[props.data.length - 1].value - props.data[0].value
  if (delta > 0.1) return 'up'
  if (delta < -0.1) return 'down'
  return 'same'
})

function drawChart() {
  if (!props.data.length) return
  const query = uni.createSelectorQuery()
  query.select(`#${props.canvasId}`).fields({ node: true, size: true }).exec((res) => {
    if (!res[0] || !res[0].node) return
    const canvas = res[0].node as HTMLCanvasElement
    const ctx = canvas.getContext('2d')!
    const width = res[0].width as number
    const height = res[0].height as number
    canvas.width = width * 2
    canvas.height = height * 2
    ctx.scale(2, 2)

    const pad = { top: 20, right: 20, bottom: 40, left: 50 }
    const w = width - pad.left - pad.right
    const h = height - pad.top - pad.bottom
    const values = props.data.map(d => d.value)
    const min = Math.min(...values) - 2
    const max = Math.max(...values) + 2

    const scaleX = (i: number) => pad.left + (i / (props.data.length - 1)) * w
    const scaleY = (v: number) => pad.top + h - ((v - min) / (max - min)) * h

    // 网格
    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 1
    for (let i = 0; i <= 4; i++) {
      const y = pad.top + (i / 4) * h
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(pad.left + w, y)
      ctx.stroke()
    }

    // 折线
    ctx.beginPath()
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    props.data.forEach((d, i) => {
      const x = scaleX(i)
      const y = scaleY(d.value)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()

    // 数据点
    props.data.forEach((d, i) => {
      const x = scaleX(i)
      const y = scaleY(d.value)
      ctx.beginPath()
      ctx.arc(x, y, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#333'
      ctx.fill()
    })

    // X轴标签
    ctx.fillStyle = '#999'
    ctx.font = '20px sans-serif'
    ctx.textAlign = 'center'
    const step = Math.ceil(props.data.length / 5)
    props.data.forEach((d, i) => {
      if (i % step === 0 || i === props.data.length - 1) {
        const x = scaleX(i)
        const y = height - 10
        ctx.fillText(d.date.slice(5), x, y)
      }
    })
  })
}

onMounted(drawChart)
watch(() => props.data, drawChart, { deep: true })
</script>

<style scoped>
.trend-chart {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}
.chart-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}
.chart-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}
.chart-unit {
  font-size: 24rpx;
  color: #999;
}
.chart-body {
  width: 100%;
}
.chart-footer {
  display: flex;
  justify-content: space-between;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #f0f0f0;
}
.stat-item {
  text-align: center;
}
.stat-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}
.stat-value {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}
.stat-unit {
  font-size: 24rpx;
  font-weight: normal;
  color: #666;
}
.stat-value.up { color: #f60; }
.stat-value.down { color: #07c160; }
.stat-value.same { color: #999; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add front/src/components/MeasurementTrendChart.vue
git commit -m "feat: 添加围度趋势图组件"
```

---

## Task 4: 重构围度记录页面

**Files:**
- Modify: `front/src/pages/data/measurements.vue`

### 新页面结构

```
measurements.vue
├── 人体轮廓区域（BodySilhouette）
├── 趋势图区域（MeasurementTrendChart，多个）
└── MeasurementPopup（条件渲染）
```

- [ ] **Step 1: 重写 `measurements.vue`**

```vue
<template>
  <view class="container">
    <!-- 人体轮廓录入区 -->
    <BodySilhouette
      :data="latestRecord || {}"
      @tap="onBodyPartTap"
    />

    <!-- 各部位趋势图 -->
    <MeasurementTrendChart
      canvas-id="chart-chest"
      title="胸围趋势"
      :data="trendData('chest')"
    />
    <MeasurementTrendChart
      canvas-id="chart-waist"
      title="腰围趋势"
      :data="trendData('waist')"
    />
    <MeasurementTrendChart
      canvas-id="chart-hip"
      title="臀围趋势"
      :data="trendData('hip')"
    />
    <MeasurementTrendChart
      canvas-id="chart-leftArm"
      title="左臂围趋势"
      :data="trendData('leftArm')"
    />
    <MeasurementTrendChart
      canvas-id="chart-rightArm"
      title="右臂围趋势"
      :data="trendData('rightArm')"
    />
    <MeasurementTrendChart
      canvas-id="chart-leftThigh"
      title="左大腿围趋势"
      :data="trendData('leftThigh')"
    />
    <MeasurementTrendChart
      canvas-id="chart-rightThigh"
      title="右大腿围趋势"
      :data="trendData('rightThigh')"
    />
    <MeasurementTrendChart
      canvas-id="chart-leftCalf"
      title="左小腿围趋势"
      :data="trendData('leftCalf')"
    />
    <MeasurementTrendChart
      canvas-id="chart-rightCalf"
      title="右小腿围趋势"
      :data="trendData('rightCalf')"
    />

    <!-- 录入弹窗 -->
    <MeasurementPopup
      :visible="popupVisible"
      :part="activePart"
      :current-value="popupCurrentValue"
      :previous-value="popupPreviousValue"
      @close="popupVisible = false"
      @confirm="onPopupConfirm"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import BodySilhouette from '../../components/BodySilhouette.vue'
import MeasurementPopup from '../../components/MeasurementPopup.vue'
import MeasurementTrendChart from '../../components/MeasurementTrendChart.vue'
import { createMeasurement, getMeasurements } from '../../api/bodyData'
import { today, dateRange } from '../../utils/date'
import { MeasurementRecord } from '../../types'

const allRecords = ref<MeasurementRecord[]>([])
const latestRecord = ref<Partial<MeasurementRecord> | null>(null)
const popupVisible = ref(false)
const activePart = ref<string | null>(null)

// 部位配置
const partKeys = ['chest', 'waist', 'hip', 'leftArm', 'rightArm', 'leftThigh', 'rightThigh', 'leftCalf', 'rightCalf'] as const

// 各部位趋势数据
function trendData(part: string) {
  return allRecords.value
    .filter(r => r[part as keyof MeasurementRecord] != null)
    .map(r => ({
      date: r.recordedAt,
      value: r[part as keyof MeasurementRecord] as number,
    }))
}

// 点击身体部位
async function onBodyPartTap(part: string) {
  activePart.value = part
  const latest = latestRecord.value?.[part as keyof MeasurementRecord] as number | undefined
  const records = allRecords.value
  const prevIdx = records.length >= 2 ? records.length - 2 : 0
  const previous = records[prevIdx]?.[part as keyof MeasurementRecord] as number | undefined
  popupCurrentValue.value = latest
  popupPreviousValue.value = previous
  popupVisible.value = true
}

const popupCurrentValue = ref<number | undefined>()
const popupPreviousValue = ref<number | undefined>()

// 弹窗确认
async function onPopupConfirm(value: number) {
  if (!activePart.value) return
  const data: Record<string, unknown> = { recordedAt: today() }
  data[activePart.value] = value
  await createMeasurement(data)
  popupVisible.value = false
  await loadData()
  uni.showToast({ title: '记录成功', icon: 'success' })
}

// 加载数据
async function loadData() {
  const { startDate, endDate } = dateRange(90)
  const records = await getMeasurements(startDate, endDate)
  allRecords.value = records
  latestRecord.value = records[records.length - 1] ?? null
}

import { onMounted } from 'vue'
onMounted(loadData)
</script>

<style>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add front/src/pages/data/measurements.vue
git commit -m "feat: 重构围度记录页面（人体轮廓交互 + 趋势图）"
git tag phase1-measurement-ui-complete
```

---

## 自检清单

| 规格要求 | 对应任务 |
|---------|---------|
| 人体轮廓可视化，点击部位弹出录入框 | Task 1, 2, 4 |
| 各部位围度趋势图（胸/腰/臀/手臂/大腿/小腿）| Task 3, 4 |
| 变化对比（较上次+/-cm） | Task 2, 3 |
| 录入状态可视化（已录入/未录入颜色区分） | Task 1 |
