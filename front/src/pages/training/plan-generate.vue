<template>
  <view class="container">
    <!-- 用户档案摘要 -->
    <view class="section">
      <text class="section-title">健身档案</text>
      <view class="profile-card">
        <view class="profile-row">
          <text class="row-label">健身目标</text>
          <text class="row-value">{{ goalLabel }}</text>
        </view>
        <view class="profile-row">
          <text class="row-label">当前水平</text>
          <text class="row-value">{{ levelLabel }}</text>
        </view>
        <view class="profile-row">
          <text class="row-label">可用器材</text>
          <text class="row-value">{{ equipmentLabel }}</text>
        </view>
        <view class="profile-row">
          <text class="row-label">每周训练天数</text>
          <text class="row-value">{{ user?.weeklyTrainingDays }}天</text>
        </view>
      </view>
    </view>

    <!-- 训练计划预览 -->
    <view class="section">
      <text class="section-title">计划说明</text>
      <view class="preview-card">
        <text class="preview-text">
          将根据您的目标和水平，生成一套为期4周的训练计划，包含每周{{ user?.weeklyTrainingDays }}次训练，覆盖全身各肌群，循序渐进提升。
        </text>
        <view class="preview-features">
          <view class="feature-item">
            <text class="feature-icon">📋</text>
            <text class="feature-text">科学分部位训练</text>
          </view>
          <view class="feature-item">
            <text class="feature-icon">📈</text>
            <text class="feature-text">渐进超负荷设计</text>
          </view>
          <view class="feature-item">
            <text class="feature-icon">🏋️</text>
            <text class="feature-text">适配您的器材</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 生成按钮 -->
    <view class="bottom-action">
      <button class="generate-btn" :disabled="generating" @tap="generatePlan">
        {{ generating ? '生成中...' : '生成训练计划' }}
      </button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useUserStore } from '../../stores/user'
import { generateTrainingPlan } from '../../api/trainingPlan'

const userStore = useUserStore()
const user = computed(() => userStore.user)
const generating = ref(false)

const goalLabelMap: Record<string, string> = {
  GAIN_MUSCLE: '增肌',
  LOSE_FAT: '减脂',
  BODY_SHAPE: '塑形',
  IMPROVE_FITNESS: '提升体能'
}

const levelLabelMap: Record<string, string> = {
  BEGINNER: '入门',
  INTERMEDIATE: '中级',
  ADVANCED: '进阶'
}

const equipmentLabelMap: Record<string, string> = {
  GYM: '健身房',
  DUMBBELL: '哑铃',
  BODYWEIGHT: '徒手'
}

const goalLabel = computed(() => goalLabelMap[user.value?.goal ?? ''] ?? '-')
const levelLabel = computed(() => levelLabelMap[user.value?.level ?? ''] ?? '-')
const equipmentLabel = computed(() => equipmentLabelMap[user.value?.equipment ?? ''] ?? '-')

async function generatePlan() {
  if (generating.value) return

  generating.value = true
  try {
    const plan = await generateTrainingPlan()
    uni.redirectTo({ url: `/pages/training/plan-detail?id=${plan.id}` })
  } catch (e) {
    console.error('Failed to generate plan:', e)
    uni.showToast({ title: '生成失败，请重试', icon: 'none' })
  } finally {
    generating.value = false
  }
}

onMounted(async () => {
  if (!user.value) {
    await userStore.fetchProfile()
  }
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 24rpx;
  padding-bottom: 200rpx;
}

.section {
  margin-bottom: 40rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 24rpx;
}

.profile-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
}

.profile-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.profile-row:last-child {
  border-bottom: none;
}

.row-label {
  font-size: 28rpx;
  color: #666;
}

.row-value {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
}

.preview-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
}

.preview-text {
  font-size: 28rpx;
  color: #666;
  line-height: 1.6;
  display: block;
  margin-bottom: 32rpx;
}

.preview-features {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.feature-icon {
  font-size: 36rpx;
}

.feature-text {
  font-size: 28rpx;
  color: #333;
}

.bottom-action {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx;
  background: #fff;
  box-shadow: 0 -2rpx 12rpx rgba(0, 0, 0, 0.05);
}

.generate-btn {
  width: 100%;
  height: 96rpx;
  background: #333;
  color: #fff;
  font-size: 32rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.generate-btn[disabled] {
  background: #ccc;
  color: #fff;
}
</style>