<template>
  <view class="measurement-trend-card">
    <!-- 无数据状态 -->
    <template v-if="cardData.message">
      <view class="empty-state">
        <text class="empty-icon">📏</text>
        <text class="empty-text">{{ cardData.message }}</text>
      </view>
    </template>

    <!-- 有数据状态 -->
    <template v-else>
      <view class="card-header">
        <text class="card-title">📏 围度趋势</text>
        <text class="card-date">近{{ cardData.period || 90 }}天</text>
      </view>

      <!-- AI 点评 -->
      <view v-if="cardData.aiComment" class="ai-comment">
        <text class="comment-icon">💬</text>
        <text class="comment-text">{{ cardData.aiComment }}</text>
      </view>

      <!-- 部位变化列表 -->
      <view v-if="cardData.parts?.length" class="parts-grid">
        <view
          v-for="part in cardData.parts"
          :key="part.name"
          class="part-item"
        >
          <text class="part-label">{{ part.label }}</text>
          <view class="part-values">
            <text class="part-current">{{ part.current ? part.current + 'cm' : '--' }}</text>
            <text
              v-if="part.change !== undefined && part.change !== 0"
              class="part-change"
              :class="part.change > 0 ? 'up' : 'down'"
            >
              {{ part.change > 0 ? '+' : '' }}{{ part.change?.toFixed(1) }}cm
            </text>
          </view>
        </view>
      </view>

      <!-- 简化趋势图 -->
      <view v-if="cardData.chartData?.length" class="trend-chart">
        <text class="chart-title">最近记录趋势</text>
        <view class="chart-bars">
          <view
            v-for="(record, idx) in chartDataDisplay"
            :key="idx"
            class="chart-bar-group"
          >
            <view class="bar-container">
              <view
                v-if="record.chest"
                class="bar bar-chest"
                :style="{ height: getBarHeight(record.chest) + 'px' }"
              />
              <view
                v-if="record.waist"
                class="bar bar-waist"
                :style="{ height: getBarHeight(record.waist) + 'px' }"
              />
            </view>
            <text class="bar-date">{{ formatDate(record.date) }}</text>
          </view>
        </view>
        <view class="chart-legend">
          <view class="legend-item">
            <view class="legend-color legend-chest" />
            <text>胸围</text>
          </view>
          <view class="legend-item">
            <view class="legend-color legend-waist" />
            <text>腰围</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 卡片动作按钮 -->
    <view v-if="actions?.length" class="card-actions">
      <button
        v-for="action in actions"
        :key="action.id"
        class="card-action-btn"
        :class="action.action"
        :disabled="disabled"
        @click="emit('action', action.id)"
      >
        {{ action.label }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { MeasurementTrendCardData } from './types'

const props = defineProps<{
  cardData: MeasurementTrendCardData
  actions?: Array<{ id: string; label: string; action: string; target?: string }>
  disabled?: boolean
}>()

const emit = defineEmits<{
  action: [actionId: string]
}>()

const chartDataDisplay = computed(() => {
  if (!props.cardData.chartData) return []
  return props.cardData.chartData.slice(-7)
})

function getBarHeight(value: number): number {
  if (!value) return 0
  const minHeight = 20
  const maxHeight = 60
  const minVal = 50
  const maxVal = 150
  const normalized = Math.min(Math.max((value - minVal) / (maxVal - minVal), 0), 1)
  return minHeight + normalized * (maxHeight - minHeight)
}

function formatDate(dateStr: string): string {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}
</script>

<style lang="scss" scoped>
.measurement-trend-card {
  padding: 16rpx;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.card-date {
  font-size: 24rpx;
  color: #999;
}

.empty-state {
  text-align: center;
  padding: 40rpx 0;
}

.empty-icon {
  font-size: 64rpx;
  display: block;
  margin-bottom: 16rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #666;
}

.ai-comment {
  background: #f0f8ff;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
}

.comment-icon {
  font-size: 28rpx;
  flex-shrink: 0;
}

.comment-text {
  font-size: 26rpx;
  color: #333;
  line-height: 1.5;
}

.parts-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.part-item {
  background: #f9f9f9;
  border-radius: 8rpx;
  padding: 12rpx;
  text-align: center;
}

.part-label {
  font-size: 22rpx;
  color: #666;
  display: block;
  margin-bottom: 4rpx;
}

.part-values {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.part-current {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.part-change {
  font-size: 22rpx;
  margin-top: 2rpx;
}

.part-change.up {
  color: #e53935;
}

.part-change.down {
  color: #07c160;
}

.trend-chart {
  background: #fafafa;
  border-radius: 12rpx;
  padding: 16rpx;
}

.chart-title {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 12rpx;
}

.chart-bars {
  display: flex;
  justify-content: space-around;
  align-items: flex-end;
  height: 80rpx;
  margin-bottom: 8rpx;
}

.chart-bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.bar-container {
  display: flex;
  gap: 4rpx;
  align-items: flex-end;
  height: 60px;
}

.bar {
  width: 12rpx;
  border-radius: 4rpx 4rpx 0 0;
}

.bar-chest {
  background: #07c160;
}

.bar-waist {
  background: #ff9800;
}

.bar-date {
  font-size: 18rpx;
  color: #999;
  margin-top: 4rpx;
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 24rpx;
  margin-top: 8rpx;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 6rpx;
  font-size: 20rpx;
  color: #666;
}

.legend-color {
  width: 16rpx;
  height: 16rpx;
  border-radius: 4rpx;
}

.legend-chest {
  background: #07c160;
}

.legend-waist {
  background: #ff9800;
}

.card-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 20rpx;
  padding-top: 16rpx;
  border-top: 1rpx solid #f0f0f0;
}

.card-action-btn {
  flex: 1;
  min-width: 200rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 26rpx;
  border-radius: 36rpx;
  border: none;
  background: #f5f5f5;
  color: #666;
}

.card-action-btn[disabled] {
  opacity: 0.5;
}

.card-action-btn.confirm,
.card-action-btn.navigate {
  background: linear-gradient(135deg, #07c160, #06ad56);
  color: #fff;
}

.card-action-btn.cancel,
.card-action-btn.dismiss {
  background: #fff;
  color: #999;
  border: 1rpx solid #eee;
}
</style>
