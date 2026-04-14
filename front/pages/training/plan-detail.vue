<template>
  <view class="container">
    <!-- Header -->
    <view class="header">
      <view class="header-top">
        <text class="plan-name">{{ plan?.name }}</text>
        <text class="goal-badge" :class="plan?.goal">{{ goalLabel(plan?.goal ?? '') }}</text>
      </view>
      <text class="date-range">{{ formatDate(plan?.startDate) }} - {{ formatDate(plan?.endDate) }}</text>
      <text class="progress-label">第{{ currentWeek }}周/共{{ plan?.weeks ?? 0 }}周</text>
    </view>

    <!-- Week tabs -->
    <scroll-view class="week-tabs" scroll-x :show-scrollbar="false">
      <view class="tabs-inner">
        <view
          v-for="w in (plan?.weeks ?? 0)"
          :key="w"
          :class="['tab', currentWeek === w ? 'active' : '']"
          @tap="currentWeek = w"
        >
          <text>周{{ w }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- Day cards -->
    <view class="days-list">
      <view
        v-for="day in weekDays"
        :key="day.id"
        :class="['day-card', day.isRest ? 'rest' : 'training']"
      >
        <view class="day-header">
          <text class="day-label">{{ dayOfWeekLabel(day.dayOfWeek) }}</text>
          <text class="day-type">{{ day.dayType }}</text>
        </view>

        <!-- Rest day -->
        <view v-if="day.isRest" class="rest-content">
          <text class="rest-tip">适度休息，帮助身体恢复</text>
        </view>

        <!-- Training day -->
        <view v-else class="exercise-list">
          <view
            v-for="ex in day.plannedExercises"
            :key="ex.id"
            class="exercise-item"
            @click="openReplaceModal(ex)"
          >
            <text class="exercise-name">{{ ex.exerciseName }}</text>
            <text class="exercise-detail">{{ ex.targetSets }}组 × {{ ex.targetReps }}</text>
            <text v-if="ex.targetWeight" class="exercise-weight">{{ ex.targetWeight }}kg</text>
            <text class="replace-hint">替换</text>
          </view>
        </view>
      </view>
    </view>

    <!-- Bottom action -->
    <view class="bottom-action">
      <button class="start-btn" @tap="startToday">开始今日训练</button>
    </view>

    <!-- 替换动作弹窗 -->
    <ExerciseReplaceModal
      v-if="plan"
      :visible="showReplaceModal"
      :plan-id="plan.id"
      :planned-exercise-id="currentReplaceExercise?.id ?? ''"
      :current-exercise="currentReplaceExercise?.exercise"
      @close="closeReplaceModal"
      @replaced="onExerciseReplaced"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getTrainingPlan } from '../../api/trainingPlan'
import type { PlanDetail, PlanDay, PlannedExercise } from '../../api/trainingPlan'
import ExerciseReplaceModal from '../../components/training/ExerciseReplaceModal.vue'

const plan = ref<PlanDetail | null>(null)
const currentWeek = ref(1)
const todayPlanDayId = ref<string | null>(null)

// 替换动作弹窗状态
const showReplaceModal = ref(false)
const currentReplaceExercise = ref<PlannedExercise | null>(null)

const goalMap: Record<string, string> = {
  GAIN_MUSCLE: '增肌',
  LOSE_FAT: '减脂',
  BODY_SHAPE: '塑形',
  IMPROVE_FITNESS: '提升体能'
}

const dayOfWeekMap: Record<number, string> = {
  1: '周一', 2: '周二', 3: '周三', 4: '周四', 5: '周五', 6: '周六', 7: '周日'
}

function goalLabel(goal: string): string {
  return goalMap[goal] ?? goal
}

function dayOfWeekLabel(day: number): string {
  return dayOfWeekMap[day] ?? ''
}

function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  return dateStr.slice(0, 10).replace(/-/g, '/')
}

const currentWeekData = computed(() => {
  if (!plan.value) return []
  return plan.value.planDays.filter((d) => d.weekNumber === currentWeek.value)
})

interface DisplayDay {
  id: string
  dayOfWeek: number
  dayType: string
  isRest: boolean
  plannedExercises: PlannedExercise[]
}

const weekDays = computed<DisplayDay[]>(() => {
  const days = currentWeekData.value
  const result: DisplayDay[] = []
  for (let i = 1; i <= 7; i++) {
    const day = days.find((d) => d.dayOfWeek === i)
    const isRest = !day || day.dayType === '休息'
    result.push({
      id: day?.id ?? `empty-${i}`,
      dayOfWeek: i,
      dayType: day?.dayType ?? '休息',
      isRest,
      plannedExercises: day?.plannedExercises ?? []
    })
  }
  return result
})

function startToday() {
  if (!todayPlanDayId.value || !plan.value) return
  uni.navigateTo({
    url: `/pages/training/today?planId=${plan.value.id}&planDayId=${todayPlanDayId.value}`
  })
}

function openReplaceModal(exercise: PlannedExercise) {
  currentReplaceExercise.value = exercise
  showReplaceModal.value = true
}

function closeReplaceModal() {
  showReplaceModal.value = false
  currentReplaceExercise.value = null
}

async function onExerciseReplaced() {
  // 替换成功后刷新计划数据
  await loadPlan()
}

async function loadPlan() {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  const id = currentPage?.options?.id

  if (!id) {
    uni.showToast({ title: '计划不存在', icon: 'none' })
    return
  }

  try {
    plan.value = await getTrainingPlan(id)

    // Calculate current week
    if (plan.value) {
      const start = new Date(plan.value.startDate)
      const now = new Date()
      const diffMs = now.getTime() - start.getTime()
      const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
      currentWeek.value = Math.min(Math.max(diffWeeks, 1), plan.value.weeks)

      // Find today's plan day
      const todayDow = (now.getDay() + 6) % 7 + 1 // Mon=1, Sun=7
      const todayDay = plan.value.planDays.find(
        (d) => d.weekNumber === currentWeek.value && d.dayOfWeek === todayDow
      )
      todayPlanDayId.value = todayDay?.id ?? null
    }
  } catch (e) {
    console.error('Failed to load plan:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
}

onMounted(() => {
  loadPlan()
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: #f5f5f5;
  padding-bottom: 200rpx;
}

.header {
  background: #fff;
  padding: 32rpx;
  border-bottom: 1rpx solid #eee;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.plan-name {
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
}

.goal-badge {
  font-size: 24rpx;
  padding: 6rpx 20rpx;
  border-radius: 12rpx;
  font-weight: 500;
}

.goal-badge.gain_muscle { background: #fff3e0; color: #e65100; }
.goal-badge.lose_fat { background: #e3f2fd; color: #1565c0; }
.goal-badge.body_shape { background: #f3e5f5; color: #6a1b9a; }
.goal-badge.improve_fitness { background: #e8f5e9; color: #2e7d32; }

.date-range {
  font-size: 26rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}

.progress-label {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

.week-tabs {
  background: #fff;
  border-bottom: 1rpx solid #eee;
}

.tabs-inner {
  display: flex;
  padding: 0 16rpx;
  gap: 8rpx;
}

.tab {
  padding: 24rpx 32rpx;
  font-size: 28rpx;
  color: #999;
  white-space: nowrap;
  position: relative;
}

.tab.active {
  color: #333;
  font-weight: bold;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background: #333;
  border-radius: 2rpx;
}

.days-list {
  padding: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.day-card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
}

.day-card.rest {
  background: #f9f9f9;
}

.day-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16rpx;
}

.day-label {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
}

.day-type {
  font-size: 26rpx;
  color: #666;
}

.rest-content {
  padding: 8rpx 0;
}

.rest-tip {
  font-size: 26rpx;
  color: #999;
}

.exercise-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.exercise-item {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f5f5f5;
}

.exercise-item:last-child {
  border-bottom: none;
}

.exercise-name {
  flex: 1;
  font-size: 28rpx;
  color: #333;
}

.exercise-detail {
  font-size: 26rpx;
  color: #666;
}

.exercise-weight {
  font-size: 26rpx;
  color: #999;
  min-width: 80rpx;
  text-align: right;
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

.start-btn {
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
</style>