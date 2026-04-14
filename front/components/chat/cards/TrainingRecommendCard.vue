<template>
  <view class="training-recommend-card">
    <!-- 休息日 -->
    <template v-if="cardData.type === 'rest_day'">
      <view class="rest-day">
        <text class="rest-icon">🌿</text>
        <text class="rest-title">{{ cardData.name || '休息日' }}</text>
        <text class="rest-reason">{{ cardData.reason || '今天适合休息' }}</text>
        <view v-if="cardData.recommendations?.length" class="recommendations">
          <text class="recommend-label">推荐活动：</text>
          <view
            v-for="(rec, idx) in cardData.recommendations"
            :key="idx"
            class="recommend-item"
          >
            {{ rec }}
          </view>
        </view>
      </view>
    </template>

    <!-- 今日已完成 -->
    <template v-else-if="cardData.type === 'completed_today'">
      <view class="completed-day">
        <text class="completed-icon">✅</text>
        <text class="completed-title">{{ cardData.name || '今日已完成' }}</text>
        <text class="completed-reason">{{ cardData.reason || '今天训练已完成，明天继续加油！' }}</text>
        <view v-if="cardData.completedTraining" class="completed-info">
          <text>已完成：{{ cardData.completedTraining.name }}</text>
          <text v-if="cardData.completedTraining.duration">
            时长：{{ cardData.completedTraining.duration }}分钟
          </text>
        </view>
      </view>
    </template>

    <!-- 过度训练预警 -->
    <template v-else-if="cardData.type === 'overtraining_warning'">
      <view class="overtraining-warning">
        <text class="warning-icon">⚠️</text>
        <text class="warning-title">过度训练预警</text>
        <view v-if="cardData.warnings?.length" class="warnings">
          <text
            v-for="(warning, idx) in cardData.warnings"
            :key="idx"
            class="warning-text"
          >
            {{ warning }}
          </text>
        </view>
        <view v-if="cardData.suggestions?.length" class="suggestions">
          <text class="suggestions-title">建议：</text>
          <text
            v-for="(suggestion, idx) in cardData.suggestions"
            :key="idx"
            class="suggestion-item"
          >
            {{ suggestion }}
          </text>
        </view>
      </view>
    </template>

    <!-- 正常推荐 -->
    <template v-else>
      <view class="recommend-header">
        <text class="recommend-title">📋 {{ cardData.name || '今日推荐训练' }}</text>
        <text v-if="cardData.reason" class="recommend-reason">{{ cardData.reason }}</text>
      </view>

      <view class="recommend-meta">
        <text v-if="cardData.duration" class="meta-item">⏱️ {{ cardData.duration }}分钟</text>
        <text v-if="cardData.type" class="meta-item">💪 {{ cardData.type }}</text>
      </view>

      <view v-if="cardData.exercises?.length" class="exercise-preview">
        <text class="preview-title">动作预览：</text>
        <view
          v-for="(ex, idx) in cardData.exercises.slice(0, 3)"
          :key="idx"
          class="preview-item"
        >
          {{ ex.name }} {{ ex.sets }}×{{ ex.reps || '8-12' }}
        </view>
        <text v-if="cardData.exercises.length > 3" class="preview-more">
          还有{{ cardData.exercises.length - 3 }}个动作...
        </text>
      </view>

      <!-- 恢复分数 -->
      <view v-if="cardData.muscleScores" class="muscle-scores">
        <view
          v-for="(score, muscle) in cardData.muscleScores"
          :key="muscle"
          class="muscle-item"
        >
          <text class="muscle-name">{{ getMuscleLabel(muscle) }}</text>
          <view class="muscle-bar">
            <view
              class="muscle-fill"
              :style="{ width: score + '%' }"
              :class="getScoreClass(score)"
            />
          </view>
          <text class="muscle-pct">{{ score }}%</text>
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
import type { TrainingRecommendCardData } from './types'

defineProps<{
  cardData: TrainingRecommendCardData
  actions?: Array<{ id: string; label: string; action: string; target?: string }>
  disabled?: boolean
}>()

const emit = defineEmits<{
  action: [actionId: string]
}>()

const muscleLabels: Record<string, string> = {
  chest: '胸肌',
  back: '背部',
  legs: '腿部',
  shoulders: '肩部',
  arms: '手臂',
  core: '核心'
}

function getMuscleLabel(muscle: string): string {
  return muscleLabels[muscle] || muscle
}

function getScoreClass(score: number): string {
  if (score >= 75) return 'score-good'
  if (score >= 50) return 'score-warning'
  return 'score-danger'
}
</script>

<style lang="scss" scoped>
.training-recommend-card {
  padding: 16rpx;
}

/* 休息日 */
.rest-day {
  text-align: center;
  padding: 24rpx;
}

.rest-icon {
  font-size: 64rpx;
  display: block;
  margin-bottom: 16rpx;
}

.rest-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.rest-reason {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 16rpx;
}

.recommendations {
  margin-top: 16rpx;
}

.recommend-label {
  font-size: 24rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}

.recommend-item {
  font-size: 26rpx;
  color: #07c160;
  padding: 4rpx 0;
}

/* 今日已完成 */
.completed-day {
  text-align: center;
  padding: 24rpx;
}

.completed-icon {
  font-size: 64rpx;
  display: block;
  margin-bottom: 16rpx;
}

.completed-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #07c160;
  display: block;
  margin-bottom: 8rpx;
}

.completed-reason {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 16rpx;
}

.completed-info {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  font-size: 24rpx;
  color: #999;
}

/* 过度训练预警 */
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
  margin-bottom: 12rpx;
}

.warnings {
  margin-bottom: 12rpx;
}

.warning-text {
  font-size: 26rpx;
  color: #e65100;
  display: block;
  margin-bottom: 4rpx;
}

.suggestions {
  border-top: 1rpx solid #ffe0b2;
  padding-top: 12rpx;
}

.suggestions-title {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 8rpx;
}

.suggestion-item {
  font-size: 24rpx;
  color: #666;
  display: block;
  padding: 4rpx 0;
}

/* 正常推荐 */
.recommend-header {
  margin-bottom: 12rpx;
}

.recommend-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 4rpx;
}

.recommend-reason {
  font-size: 24rpx;
  color: #666;
}

.recommend-meta {
  display: flex;
  gap: 24rpx;
  margin-bottom: 12rpx;
}

.meta-item {
  font-size: 24rpx;
  color: #999;
}

.exercise-preview {
  background: #f9f9f9;
  border-radius: 8rpx;
  padding: 12rpx;
  margin-bottom: 12rpx;
}

.preview-title {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 8rpx;
}

.preview-item {
  font-size: 26rpx;
  color: #333;
  padding: 4rpx 0;
}

.preview-more {
  font-size: 22rpx;
  color: #999;
  margin-top: 4rpx;
}

/* 肌群恢复分数 */
.muscle-scores {
  margin-bottom: 12rpx;
}

.muscle-item {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 6rpx 0;
}

.muscle-name {
  font-size: 24rpx;
  color: #666;
  width: 60rpx;
}

.muscle-bar {
  flex: 1;
  height: 12rpx;
  background: #eee;
  border-radius: 6rpx;
}

.muscle-fill {
  height: 100%;
  border-radius: 6rpx;
  transition: width 0.3s;
}

.muscle-fill.score-good {
  background: #07c160;
}

.muscle-fill.score-warning {
  background: #ff9800;
}

.muscle-fill.score-danger {
  background: #e53935;
}

.muscle-pct {
  font-size: 22rpx;
  color: #999;
  width: 50rpx;
  text-align: right;
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
</style>
