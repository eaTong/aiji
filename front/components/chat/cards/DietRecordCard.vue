<template>
  <view class="diet-record-card">
    <!-- 无数据状态 -->
    <template v-if="cardData.message">
      <view class="empty-state">
        <text class="empty-icon">🍽️</text>
        <text class="empty-text">{{ cardData.message }}</text>
      </view>
    </template>

    <!-- 有数据状态 -->
    <template v-else>
      <view class="card-header">
        <text class="card-icon">🍽️</text>
        <text class="card-title">饮食记录</text>
        <text class="card-date">{{ cardData.date }}</text>
      </view>

      <!-- 总览 -->
      <view v-if="cardData.totalCalories || cardData.totalProtein" class="nutrition-summary">
        <view v-if="cardData.totalCalories" class="summary-item">
          <text class="summary-value">{{ cardData.totalCalories }}</text>
          <text class="summary-unit">kcal</text>
        </view>
        <view v-if="cardData.totalProtein" class="summary-item">
          <text class="summary-value protein">{{ cardData.totalProtein }}g</text>
          <text class="summary-label">蛋白质</text>
        </view>
      </view>

      <!-- 餐次列表 -->
      <view v-if="cardData.meals?.length" class="meals-list">
        <view
          v-for="meal in cardData.meals"
          :key="meal.type"
          class="meal-item"
        >
          <view class="meal-header">
            <text class="meal-icon">{{ getMealIcon(meal.type) }}</text>
            <text class="meal-type">{{ getMealLabel(meal.type) }}</text>
            <text v-if="meal.estimatedCalories" class="meal-calories">
              {{ meal.estimatedCalories }}kcal
            </text>
          </view>
          <view class="meal-content">
            <text class="meal-description">{{ meal.description }}</text>
            <view v-if="meal.protein" class="meal-protein">
              <text class="protein-tag">蛋白质 {{ meal.protein }}g</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 总结 -->
      <view v-if="cardData.summary" class="diet-summary">
        <text class="summary-icon">📝</text>
        <text class="summary-text">{{ cardData.summary }}</text>
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
import type { DietRecordCardData } from './types'

const props = defineProps<{
  cardData: DietRecordCardData
  actions?: Array<{ id: string; label: string; action: string; target?: string }>
  disabled?: boolean
}>()

const emit = defineEmits<{
  action: [actionId: string]
}>()

const mealIcons: Record<string, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍪'
}

const mealLabels: Record<string, string> = {
  breakfast: '早餐',
  lunch: '午餐',
  dinner: '晚餐',
  snack: '加餐'
}

function getMealIcon(type: string): string {
  return mealIcons[type] || '🍽️'
}

function getMealLabel(type: string): string {
  return mealLabels[type] || type
}
</script>

<style lang="scss" scoped>
.diet-record-card {
  padding: 16rpx;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 16rpx;
}

.card-icon {
  font-size: 36rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  flex: 1;
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

.nutrition-summary {
  display: flex;
  gap: 24rpx;
  margin-bottom: 20rpx;
  padding: 16rpx;
  background: #fafafa;
  border-radius: 12rpx;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.summary-value {
  font-size: 36rpx;
  font-weight: bold;
  color: #ff9800;
}

.summary-value.protein {
  color: #07c160;
}

.summary-unit {
  font-size: 22rpx;
  color: #999;
}

.summary-label {
  font-size: 22rpx;
  color: #666;
  margin-top: 4rpx;
}

.meals-list {
  margin-bottom: 16rpx;
}

.meal-item {
  background: #f9f9f9;
  border-radius: 12rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
}

.meal-header {
  display: flex;
  align-items: center;
  gap: 8rpx;
  margin-bottom: 8rpx;
}

.meal-icon {
  font-size: 28rpx;
}

.meal-type {
  font-size: 26rpx;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.meal-calories {
  font-size: 24rpx;
  color: #ff9800;
}

.meal-content {
  padding-left: 36rpx;
}

.meal-description {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
  display: block;
}

.meal-protein {
  margin-top: 8rpx;
}

.protein-tag {
  font-size: 22rpx;
  color: #07c160;
  background: #e8f8f0;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}

.diet-summary {
  display: flex;
  align-items: flex-start;
  gap: 8rpx;
  background: #fff8e1;
  padding: 16rpx;
  border-radius: 12rpx;
}

.summary-icon {
  font-size: 28rpx;
  flex-shrink: 0;
}

.summary-text {
  font-size: 26rpx;
  color: #666;
  line-height: 1.5;
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
