<template>
  <view class="onboarding-page">
    <!-- 顶部步骤指示器 -->
    <StepIndicator :current-step="currentStep" :total-steps="4" />

    <!-- Step 内容 -->
    <swiper
      :current="currentStep - 1"
      :disable-swipe="true"
      class="step-swiper"
    >
      <!-- Step 1: 健身目标 -->
      <swiper-item>
        <StepGoal v-model="formData.goal" />
      </swiper-item>

      <!-- Step 2: 当前状态 -->
      <swiper-item>
        <StepStatus
          v-model:level="formData.level"
          v-model:equipment="formData.equipment"
          v-model:weeklyDays="formData.weeklyTrainingDays"
        />
      </swiper-item>

      <!-- Step 3: 身体数据（可选） -->
      <swiper-item>
        <StepBodyData
          v-model:height="formData.height"
          v-model:currentWeight="formData.currentWeight"
          v-model:targetWeight="formData.targetWeight"
        />
      </swiper-item>

      <!-- Step 4: 健身时长 -->
      <swiper-item>
        <StepDuration v-model="formData.fitnessDuration" />
      </swiper-item>
    </swiper>

    <!-- 底部按钮 -->
    <view class="bottom-actions">
      <button v-if="currentStep > 1" class="btn-back" @tap="prevStep">上一步</button>
      <button
        v-if="currentStep < 4"
        class="btn-next"
        :disabled="!canNext"
        @tap="nextStep"
      >
        下一步
      </button>
      <button
        v-else
        class="btn-submit"
        :disabled="!canSubmit || submitting"
        @tap="submit"
      >
        {{ submitting ? '生成中...' : '开始健身之旅' }}
      </button>
    </view>

    <!-- 跳过按钮 -->
    <view v-if="currentStep === 3" class="skip-btn" @tap="skipBodyData">
      <text>跳过（稍后补充）</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import StepIndicator from '../../components/onboarding/StepIndicator.vue'
import StepGoal from '../../components/onboarding/StepGoal.vue'
import StepStatus from '../../components/onboarding/StepStatus.vue'
import StepBodyData from '../../components/onboarding/StepBodyData.vue'
import StepDuration from '../../components/onboarding/StepDuration.vue'
import { completeOnboarding } from '../../api/onboarding'
import type { OnboardingData } from '../../types'

// 问卷表单数据
const formData = ref<OnboardingData>({
  goal: 'GAIN_MUSCLE',
  level: 'BEGINNER',
  equipment: 'GYM',
  weeklyTrainingDays: 3,
  height: undefined,
  currentWeight: undefined,
  targetWeight: undefined,
  fitnessDuration: 'LESS_THAN_3M',
})

const currentStep = ref(1)
const submitting = ref(false)

// 检查是否可以选择下一步
const canNext = computed(() => {
  if (currentStep.value === 1) {
    return !!formData.value.goal
  }
  if (currentStep.value === 2) {
    return !!formData.value.level && !!formData.value.equipment && formData.value.weeklyTrainingDays > 0
  }
  if (currentStep.value === 4) {
    return !!formData.value.fitnessDuration
  }
  return true
})

// 检查是否可以提交
const canSubmit = computed(() => {
  return (
    !!formData.value.goal &&
    !!formData.value.level &&
    !!formData.value.equipment &&
    formData.value.weeklyTrainingDays > 0 &&
    !!formData.value.fitnessDuration
  )
})

function prevStep() {
  if (currentStep.value > 1) {
    currentStep.value--
  }
}

function nextStep() {
  if (currentStep.value < 4 && canNext.value) {
    currentStep.value++
  }
}

function skipBodyData() {
  // 跳过身体数据，直接进入下一步
  formData.value.height = undefined
  formData.value.currentWeight = undefined
  formData.value.targetWeight = undefined
  currentStep.value = 4
}

async function submit() {
  if (!canSubmit.value || submitting.value) return

  submitting.value = true
  try {
    const result = await completeOnboarding(formData.value)

    uni.showToast({
      title: '计划已生成！',
      icon: 'success',
    })

    // 跳转到计划详情页
    setTimeout(() => {
      uni.redirectTo({
        url: `/pages/training/plan-detail?id=${result.planId}`,
      })
    }, 1000)
  } catch (err: any) {
    uni.showToast({
      title: err.message || '提交失败',
      icon: 'none',
    })
  } finally {
    submitting.value = false
  }
}

onMounted(() => {
  // 设置导航栏标题
  uni.setNavigationBarTitle({ title: '初始化设置' })
})
</script>

<style scoped>
.onboarding-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 32rpx;
  padding-bottom: 200rpx;
}

.step-swiper {
  height: calc(100vh - 300rpx);
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: #fff;
  display: flex;
  gap: 24rpx;
  box-shadow: 0 -4rpx 20rpx rgba(0, 0, 0, 0.05);
}

.btn-back {
  flex: 1;
  height: 96rpx;
  line-height: 96rpx;
  background: #f5f5f5;
  color: #666;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 48rpx;
  border: none;
}

.btn-next {
  flex: 2;
  height: 96rpx;
  line-height: 96rpx;
  background: #333;
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 48rpx;
  border: none;
}

.btn-next[disabled] {
  background: #ccc;
  color: #fff;
}

.btn-submit {
  flex: 2;
  height: 96rpx;
  line-height: 96rpx;
  background: #07c160;
  color: #fff;
  font-size: 32rpx;
  font-weight: bold;
  border-radius: 48rpx;
  border: none;
}

.btn-submit[disabled] {
  background: #ccc;
  color: #fff;
}

.skip-btn {
  text-align: center;
  margin-top: 24rpx;
}

.skip-btn text {
  font-size: 26rpx;
  color: #999;
}
</style>
