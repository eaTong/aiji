<template>
  <view class="muscle-heatmap">
    <text class="section-title">肌群恢复状态</text>
    <view class="muscle-grid">
      <view
        v-for="(value, key) in muscleStatus"
        :key="key"
        class="muscle-card"
        :style="{ backgroundColor: getColor(value) }"
      >
        <text class="muscle-name">{{ labelMap[key] ?? key }}</text>
        <text class="muscle-value">{{ value }}%</text>
      </view>
    </view>
    <view class="legend">
      <view class="legend-item">
        <view class="legend-color" style="background:#FFCDD2"></view>
        <text class="legend-text">未恢复 (&lt;40%)</text>
      </view>
      <view class="legend-item">
        <view class="legend-color" style="background:#FFE0B2"></view>
        <text class="legend-text">部分恢复 (40-70%)</text>
      </view>
      <view class="legend-item">
        <view class="legend-color" style="background:#C8E6C9"></view>
        <text class="legend-text">已恢复 (&gt;=70%)</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  muscleStatus: Record<string, number>
}>()

const labelMap: Record<string, string> = {
  chest: '胸',
  back: '背',
  legs: '腿',
  shoulders: '肩',
  arms: '臂',
  core: '核心',
  upper_chest: '上胸',
  lats: '背阔',
  quads: '股四',
  hamstrings: '腘绳',
  glutes: '臀',
  triceps: '三头',
  biceps: '二头',
  abs: '腹',
  side_delts: '侧肩',
  rear_delts: '后肩',
}

function getColor(value: number): string {
  if (value < 40) return '#FFCDD2'
  if (value < 70) return '#FFE0B2'
  return '#C8E6C9'
}
</script>

<style scoped>
.muscle-heatmap {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.section-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 12px;
  display: block;
}

.muscle-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 12px;
}

.muscle-card {
  border-radius: 8px;
  padding: 10px 6px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.muscle-name {
  font-size: 13px;
  color: #333;
}

.muscle-value {
  font-size: 14px;
  font-weight: 600;
  color: #333;
}

.legend {
  display: flex;
  justify-content: space-around;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.legend-color {
  width: 12px;
  height: 12px;
  border-radius: 3px;
}

.legend-text {
  font-size: 11px;
  color: #666;
}
</style>
