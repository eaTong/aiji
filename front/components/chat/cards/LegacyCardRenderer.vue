<template>
  <view class="legacy-card">
    <!-- 围度记录卡片 -->
    <template v-if="cardType === 'measurement-record'">
      <view class="measurement-record">
        <text class="card-title">📏 围度记录</text>
        <text class="record-date">{{ cardData.date }}</text>
        <view class="measurement-grid">
          <view v-if="cardData.measurements?.waist" class="measurement-item">
            <text class="m-label">腰围</text>
            <text class="m-value">{{ cardData.measurements.waist }}cm</text>
          </view>
          <view v-if="cardData.measurements?.hip" class="measurement-item">
            <text class="m-label">臀围</text>
            <text class="m-value">{{ cardData.measurements.hip }}cm</text>
          </view>
          <view v-if="cardData.measurements?.chest" class="measurement-item">
            <text class="m-label">胸围</text>
            <text class="m-value">{{ cardData.measurements.chest }}cm</text>
          </view>
          <view v-if="cardData.measurements?.leftArm" class="measurement-item">
            <text class="m-label">左臂</text>
            <text class="m-value">{{ cardData.measurements.leftArm }}cm</text>
          </view>
          <view v-if="cardData.measurements?.rightArm" class="measurement-item">
            <text class="m-label">右臂</text>
            <text class="m-value">{{ cardData.measurements.rightArm }}cm</text>
          </view>
          <view v-if="cardData.measurements?.leftThigh" class="measurement-item">
            <text class="m-label">左腿</text>
            <text class="m-value">{{ cardData.measurements.leftThigh }}cm</text>
          </view>
          <view v-if="cardData.measurements?.rightThigh" class="measurement-item">
            <text class="m-label">右腿</text>
            <text class="m-value">{{ cardData.measurements.rightThigh }}cm</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 体重趋势卡片 -->
    <template v-else-if="cardType === 'weight-trend'">
      <view class="weight-trend">
        <text class="trend-title">体重趋势</text>
        <view class="trend-chart">
          <view class="chart-placeholder">
            <text class="chart-icon">📈</text>
            <text class="chart-text">近{{ cardData.period || 30 }}天趋势图</text>
          </view>
        </view>
        <view class="trend-stats">
          <view class="trend-item">
            <text class="t-label">当前</text>
            <text class="t-value">{{ cardData.currentWeight || '--' }}kg</text>
          </view>
          <view class="trend-item">
            <text class="t-label">变化</text>
            <text class="t-value" :class="getTrendClass(cardData.change)">
              {{ formatChange(cardData.change) }}
            </text>
          </view>
          <view class="trend-item">
            <text class="t-label">目标</text>
            <text class="t-value">{{ cardData.targetWeight || '--' }}kg</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 动作详情卡片 -->
    <template v-else-if="cardType === 'exercise-detail'">
      <view class="exercise-detail">
        <text class="detail-title">{{ cardData.name }}</text>
        <view class="detail-info">
          <text class="info-item">部位: {{ cardData.category }}</text>
          <text class="info-item">器材: {{ cardData.equipment }}</text>
        </view>
        <view v-if="cardData.instructions" class="detail-section">
          <text class="section-title">动作说明</text>
          <text class="section-content">{{ cardData.instructions }}</text>
        </view>
        <view v-if="cardData.muscles?.length" class="detail-section">
          <text class="section-title">锻炼肌群</text>
          <view class="muscle-tags">
            <text
              v-for="(m, idx) in cardData.muscles"
              :key="idx"
              class="muscle-tag"
            >
              {{ m }}
            </text>
          </view>
        </view>
      </view>
    </template>

    <!-- 个人记录卡片 -->
    <template v-else-if="cardType === 'personal-record'">
      <view class="personal-record">
        <text class="pr-icon">🏆</text>
        <text class="pr-title">新纪录！</text>
        <view class="pr-exercise">{{ cardData.exerciseName }}</view>
        <view v-if="cardData.newRecord" class="pr-stats">
          <view class="pr-item">
            <text class="pr-label">重量</text>
            <text class="pr-value">{{ cardData.newRecord.weight }}kg</text>
          </view>
          <view class="pr-item">
            <text class="pr-label">次数</text>
            <text class="pr-value">{{ cardData.newRecord.reps }}次</text>
          </view>
          <view class="pr-item">
            <text class="pr-label">E1RM</text>
            <text class="pr-value">{{ cardData.newRecord.e1rm }}kg</text>
          </view>
        </view>
        <view v-if="cardData.improvement" class="pr-improvement">
          比上次提升 {{ cardData.improvement }}kg
        </view>
        <view v-if="cardData.message" class="pr-message">
          {{ cardData.message }}
        </view>
      </view>
    </template>

    <!-- 目标进度卡片 -->
    <template v-else-if="cardType === 'goal-progress'">
      <view class="goal-progress">
        <text class="goal-title">🎯 目标进度</text>
        <view class="goal-info">
          <text class="goal-type">{{ getGoalTypeText(cardData.goal?.type || cardData.goalType) }}</text>
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: (cardData.progress || 0) + '%' }" />
          </view>
          <text class="progress-text">
            {{ cardData.goal?.current || cardData.current || 0 }} / {{ cardData.goal?.target || cardData.target || 100 }}
            ({{ cardData.progress || 0 }}%)
          </text>
        </view>
        <view v-if="cardData.encouragement" class="encouragement">
          {{ cardData.encouragement }}
        </view>
      </view>
    </template>

    <!-- 过度训练预警卡片 -->
    <template v-else-if="cardType === 'overtraining-warning'">
      <view class="overtraining-warning">
        <text class="warning-icon">⚠️</text>
        <text class="warning-title">过度训练预警</text>
        <text class="warning-desc">{{ cardData.message || cardData.recommendation || '检测到连续高强度训练' }}</text>
        <view class="warning-stats">
          <text>连续训练: {{ cardData.consecutiveDays || 0 }}天</text>
          <text>建议: {{ cardData.suggestions?.[0] || '休息1-2天' }}</text>
        </view>
      </view>
    </template>

    <!-- 选项选择卡片 -->
    <template v-else-if="cardType === 'option-choice'">
      <view class="option-choice">
        <text class="card-title">❓ 请选择</text>
        <text class="choice-question">{{ cardData.question }}</text>
        <view class="choice-options">
          <button
            v-for="(option, idx) in cardData.options"
            :key="idx"
            class="option-btn"
            @click="emit('action', 'option-' + idx)"
          >
            {{ option }}
          </button>
        </view>
      </view>
    </template>

    <!-- 计划预览卡片 -->
    <template v-else-if="cardType === 'plan-preview'">
      <view class="plan-preview">
        <text class="card-title">📋 计划预览</text>
        <text class="preview-title">{{ cardData.planName }}</text>
        <view class="week-view">
          <view
            v-for="(day, idx) in cardData.days"
            :key="idx"
            class="day-item"
            :class="{ active: day.hasTraining }"
          >
            <text class="day-name">{{ day.dayOfWeek }}</text>
            <text class="day-type">{{ day.dayType || '-' }}</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 饮食记录卡片 -->
    <template v-else-if="cardType === 'diet-record'">
      <view class="diet-record">
        <text class="diet-title">🍽️ 饮食记录</text>
        <view class="diet-date">{{ cardData.date }}</view>
        <view v-if="cardData.totalCalories || cardData.calories" class="calorie-summary">
          <text class="calorie-value">{{ cardData.totalCalories || cardData.calories }}</text>
          <text class="calorie-unit">大卡</text>
        </view>
        <view v-if="cardData.meals?.length" class="meal-list">
          <view
            v-for="(meal, idx) in cardData.meals"
            :key="idx"
            class="meal-item"
          >
            <text class="meal-type">{{ getMealTypeText(meal.type) }}</text>
            <text class="meal-foods">{{ meal.foods?.join(', ') || meal.description }}</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 日报卡片 -->
    <template v-else-if="cardType === 'daily-report'">
      <view class="daily-report">
        <text class="card-title">📊 今日日报</text>
        <view class="report-stats">
          <view class="stat-item">
            <text class="stat-value">{{ cardData.trainingCount || 0 }}</text>
            <text class="stat-label">训练次数</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ cardData.totalVolume || 0 }}kg</text>
            <text class="stat-label">总容量</text>
          </view>
          <view class="stat-item">
            <text class="stat-value">{{ cardData.duration || 0 }}分钟</text>
            <text class="stat-label">训练时长</text>
          </view>
        </view>
      </view>
    </template>

    <!-- 每日计划卡片 -->
    <template v-else-if="cardType === 'daily-plan'">
      <view class="daily-plan">
        <text class="card-title">📋 今日计划</text>
        <text class="plan-date">{{ cardData.date }}</text>
        <text class="plan-name">{{ cardData.planName }}</text>
        <text class="plan-day-type">{{ cardData.dayType }}</text>
        <view class="plan-meta">
          <text>{{ cardData.exerciseCount }}个动作</text>
          <text>约{{ cardData.estimatedDuration }}分钟</text>
        </view>
      </view>
    </template>

    <!-- 默认卡片 -->
    <template v-else>
      <view class="default-card">
        <text>{{ JSON.stringify(cardData) }}</text>
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
defineProps<{
  cardType: string
  cardData: Record<string, any>
  actions?: Array<{ id: string; label: string; action: string; target?: string }>
  disabled?: boolean
}>()

const emit = defineEmits<{
  action: [actionId: string]
}>()

function getTrendClass(change: number): string {
  if (change > 0) return 'trend-up'
  if (change < 0) return 'trend-down'
  return 'trend-flat'
}

function formatChange(change: number): string {
  if (change === undefined || change === null) return '--'
  return change > 0 ? `+${change}kg` : `${change}kg`
}

function getGoalTypeText(type: string): string {
  switch (type) {
    case 'LOSE_FAT': return '减脂'
    case 'GAIN_MUSCLE': return '增肌'
    case 'BODY_SHAPE': return '塑形'
    default: return type || '目标'
  }
}

function getMealTypeText(type: string): string {
  switch (type) {
    case 'breakfast': return '🌅 早餐'
    case 'lunch': return '☀️ 午餐'
    case 'dinner': return '🌙 晚餐'
    case 'snack': return '🍪 加餐'
    default: return type
  }
}
</script>

<style lang="scss" scoped>
.legacy-card {
  padding: 16rpx;
}

/* ========== 围度记录 ========== */
.measurement-record {
  padding: 16rpx;
}

.record-date {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 12rpx;
}

.measurement-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16rpx;
}

.measurement-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8rpx 0;
}

.m-label {
  font-size: 24rpx;
  color: #666;
}

.m-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #07c160;
}

/* ========== 体重趋势 ========== */
.weight-trend {
  padding: 16rpx;
}

.trend-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}

.trend-chart {
  height: 160rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.chart-placeholder {
  text-align: center;
}

.chart-icon {
  font-size: 40rpx;
  display: block;
}

.chart-text {
  font-size: 22rpx;
  color: #999;
}

.trend-stats {
  display: flex;
  justify-content: space-around;
}

.trend-item {
  text-align: center;
}

.t-label {
  font-size: 22rpx;
  color: #999;
  display: block;
}

.t-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.trend-up { color: #e53935; }
.trend-down { color: #07c160; }

/* ========== 动作详情 ========== */
.exercise-detail {
  padding: 16rpx;
}

.detail-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}

.detail-info {
  display: flex;
  gap: 24rpx;
  margin-bottom: 16rpx;
}

.info-item {
  font-size: 24rpx;
  color: #666;
}

.detail-section {
  margin-bottom: 12rpx;
}

.section-title {
  font-size: 26rpx;
  font-weight: 500;
  color: #333;
  display: block;
  margin-bottom: 6rpx;
}

.section-content {
  font-size: 24rpx;
  color: #666;
  line-height: 1.5;
}

.muscle-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}

.muscle-tag {
  padding: 4rpx 12rpx;
  background: #f0f0f0;
  border-radius: 12rpx;
  font-size: 22rpx;
  color: #666;
}

/* ========== 个人记录 ========== */
.personal-record {
  padding: 24rpx;
  text-align: center;
}

.pr-icon {
  font-size: 64rpx;
  display: block;
  margin-bottom: 8rpx;
}

.pr-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #ff9800;
  display: block;
  margin-bottom: 4rpx;
}

.pr-exercise {
  font-size: 28rpx;
  color: #333;
  margin-bottom: 16rpx;
}

.pr-stats {
  display: flex;
  justify-content: space-around;
  margin-bottom: 12rpx;
}

.pr-item {
  text-align: center;
}

.pr-label {
  font-size: 22rpx;
  color: #999;
  display: block;
}

.pr-value {
  font-size: 28rpx;
  font-weight: 600;
  color: #07c160;
}

.pr-improvement {
  font-size: 24rpx;
  color: #ff9800;
}

.pr-message {
  font-size: 24rpx;
  color: #666;
  margin-top: 8rpx;
}

/* ========== 目标进度 ========== */
.goal-progress {
  padding: 16rpx;
}

.goal-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}

.goal-type {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 8rpx;
}

.progress-bar {
  height: 16rpx;
  background: #eee;
  border-radius: 8rpx;
  margin-bottom: 8rpx;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #07c160, #06ad56);
  border-radius: 8rpx;
}

.progress-text {
  font-size: 24rpx;
  color: #666;
  text-align: center;
  display: block;
}

.encouragement {
  font-size: 24rpx;
  color: #07c160;
  text-align: center;
  margin-top: 8rpx;
}

/* ========== 过度训练预警 ========== */
.overtraining-warning {
  padding: 16rpx;
  background: #fff3e0;
  border-radius: 12rpx;
}

.warning-icon {
  font-size: 48rpx;
  display: block;
  text-align: center;
  margin-bottom: 8rpx;
}

.warning-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #e65100;
  display: block;
  text-align: center;
  margin-bottom: 4rpx;
}

.warning-desc {
  font-size: 24rpx;
  color: #666;
  display: block;
  text-align: center;
  margin-bottom: 12rpx;
}

.warning-stats {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  font-size: 24rpx;
  color: #999;
}

/* ========== 选项选择 ========== */
.option-choice {
  padding: 16rpx;
}

.choice-question {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
}

.choice-options {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.option-btn {
  padding: 20rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
  border: none;
  text-align: left;
}

/* ========== 计划预览 ========== */
.plan-preview {
  padding: 16rpx;
}

.preview-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}

.week-view {
  display: flex;
  gap: 8rpx;
}

.day-item {
  flex: 1;
  text-align: center;
  padding: 8rpx 4rpx;
  border-radius: 8rpx;
  background: #f5f5f5;

  &.active {
    background: #e8f8f0;
  }
}

.day-name {
  font-size: 22rpx;
  color: #666;
  display: block;
}

.day-type {
  font-size: 20rpx;
  color: #07c160;
  display: block;
  margin-top: 2rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* ========== 饮食记录 ========== */
.diet-record {
  padding: 16rpx;
}

.diet-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 4rpx;
}

.diet-date {
  font-size: 24rpx;
  color: #666;
  margin-bottom: 12rpx;
}

.calorie-summary {
  text-align: center;
  margin-bottom: 12rpx;
}

.calorie-value {
  font-size: 48rpx;
  font-weight: bold;
  color: #ff9800;
}

.calorie-unit {
  font-size: 24rpx;
  color: #666;
}

.meal-list {
  border-top: 1rpx solid #eee;
  padding-top: 12rpx;
}

.meal-item {
  padding: 8rpx 0;
}

.meal-type {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 2rpx;
}

.meal-foods {
  font-size: 26rpx;
  color: #333;
}

/* ========== 日报 ========== */
.daily-report {
  padding: 16rpx;
}

.report-stats {
  display: flex;
  justify-content: space-around;
  margin: 16rpx 0;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #07c160;
}

.stat-label {
  display: block;
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

/* ========== 每日计划 ========== */
.daily-plan {
  padding: 16rpx;
}

.plan-date {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 8rpx;
}

.plan-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 4rpx;
}

.plan-day-type {
  display: block;
  font-size: 26rpx;
  color: #07c160;
  margin-bottom: 12rpx;
}

.plan-meta {
  display: flex;
  gap: 24rpx;
  font-size: 24rpx;
  color: #999;
}

/* ========== 默认 ========== */
.default-card {
  padding: 16rpx;
}

/* ========== 通用 ========== */
.card-title {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
  display: block;
  margin-bottom: 16rpx;
}

/* 卡片动作按钮 */
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

.card-action-btn.danger {
  background: #fff;
  color: #e53935;
  border: 1rpx solid #e53935;
}
</style>
