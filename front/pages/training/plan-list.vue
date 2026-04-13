<template>
  <view class="container">
    <!-- 当前计划 -->
    <view v-if="activePlan" class="section">
      <text class="section-title">当前计划</text>
      <view class="active-card" @tap="goPlanDetail(activePlan.id)">
        <view class="card-header">
          <text class="plan-name">{{ activePlan.name }}</text>
          <text class="goal-badge" :class="activePlan.goal">{{ goalLabel(activePlan.goal) }}</text>
        </view>

        <!-- Progress bar -->
        <view class="progress-info">
          <text class="progress-text">第{{ currentWeek }}周/共{{ activePlan.weeks }}周</text>
          <view class="progress-bar">
            <view class="progress-fill" :style="{ width: progressPercent + '%' }"></view>
          </view>
        </view>

        <!-- Week schedule preview -->
        <view class="week-schedule">
          <view
            v-for="day in weekSchedule"
            :key="day.dayOfWeek"
            :class="['day-chip', day.isRest ? 'rest' : 'training']"
          >
            <text class="day-abbr">{{ dayOfWeekLabel(day.dayOfWeek) }}</text>
            <text class="day-type-abbr">{{ dayTypeAbbr(day.dayType) }}</text>
          </view>
        </view>

        <view class="card-arrow">›</view>
      </view>
    </view>

    <!-- 无当前计划提示 -->
    <view v-else class="no-plan-tip">
      <text class="tip-icon">📋</text>
      <text class="tip-text">暂无进行中的训练计划</text>
      <text class="tip-sub">生成一个训练计划开始你的健身之旅吧</text>
    </view>

    <!-- 历史计划 -->
    <view v-if="historyPlans.length > 0" class="section">
      <text class="section-title">历史计划</text>
      <view v-for="plan in historyPlans" :key="plan.id" class="history-item" @tap="goPlanDetail(plan.id)">
        <view class="history-info">
          <text class="history-name">{{ plan.name }}</text>
          <text class="history-date">{{ formatDateRange(plan.startDate, plan.endDate) }}</text>
        </view>
        <view class="history-right">
          <text :class="['status-badge', plan.status.toLowerCase()]">{{ statusLabel(plan.status) }}</text>
          <text class="history-arrow">›</text>
        </view>
      </view>
    </view>

    <!-- 生成新计划按钮 -->
    <view class="bottom-action">
      <button class="generate-btn" @tap="goGenerate">生成新计划</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getTrainingPlans } from '../../api/trainingPlan'
import type { WorkoutPlan, PlanDay } from '../../api/trainingPlan'

const activePlan = ref<WorkoutPlan | null>(null)
const allPlans = ref<WorkoutPlan[]>([])
const planDaysMap = ref<Record<string, PlanDay[]>>({})
const loading = ref(false)

const goalMap: Record<string, string> = {
  GAIN_MUSCLE: '增肌',
  LOSE_FAT: '减脂',
  BODY_SHAPE: '塑形',
  IMPROVE_FITNESS: '提升体能'
}

const dayOfWeekMap: Record<number, string> = {
  1: '一', 2: '二', 3: '三', 4: '四', 5: '五', 6: '六', 7: '日'
}

const dayTypeAbbrMap: Record<string, string> = {
  '休息': '休',
  '胸部+三头': '胸+三',
  '背部+二头': '背+二',
  '腿部': '腿',
  '肩部+手臂': '肩+臂',
  '全身': '全身',
  '上肢推': '上推',
  '上肢拉': '上拉',
  '下肢': '下肢',
  '有氧': '有氧',
  '核心+有氧': '核+有氧',
  '推': '推',
  '拉': '拉',
  '功能训练': '功能',
  '上肢': '上肢'
}

function goalLabel(goal: string): string {
  return goalMap[goal] ?? goal
}

function dayOfWeekLabel(day: number): string {
  return dayOfWeekMap[day] ?? ''
}

function dayTypeAbbr(dayType: string): string {
  return dayTypeAbbrMap[dayType] ?? dayType
}

function statusLabel(status: string): string {
  return { COMPLETED: '已完成', ARCHIVED: '已归档' }[status] ?? status
}

function formatDateRange(start: string, end: string): string {
  const s = start ? start.slice(0, 10).replace(/-/g, '/') : ''
  const e = end ? end.slice(0, 10).replace(/-/g, '/') : ''
  return `${s} - ${e}`
}

const currentWeek = computed(() => {
  if (!activePlan.value) return 1
  const start = new Date(activePlan.value.startDate)
  const now = new Date()
  const diffMs = now.getTime() - start.getTime()
  const diffWeeks = Math.floor(diffMs / (7 * 24 * 60 * 60 * 1000)) + 1
  return Math.min(Math.max(diffWeeks, 1), activePlan.value.weeks)
})

const progressPercent = computed(() => {
  if (!activePlan.value) return 0
  return Math.round((currentWeek.value / activePlan.value.weeks) * 100)
})

const weekSchedule = computed(() => {
  if (!activePlan.value) return []
  const planId = activePlan.value.id
  const days = planDaysMap.value[planId] ?? []
  const thisWeekDays = days
    .filter((d) => d.weekNumber === currentWeek.value)
    .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
    .slice(0, 7)

  // Fill in Mon-Sun
  const schedule = []
  for (let i = 1; i <= 7; i++) {
    const day = thisWeekDays.find((d) => d.dayOfWeek === i)
    schedule.push({
      dayOfWeek: i,
      dayType: day?.dayType ?? '休息',
      isRest: !day || day.dayType === '休息'
    })
  }
  return schedule
})

function goPlanDetail(id: string) {
  uni.navigateTo({ url: `/pages/training/plan-detail?id=${id}` })
}

function goGenerate() {
  uni.navigateTo({ url: '/pages/training/plan-generate' })
}

async function loadPlans() {
  loading.value = true
  try {
    const plans = await getTrainingPlans()
    allPlans.value = plans
    activePlan.value = plans.find((p) => p.status === 'ACTIVE') ?? null

    // For each plan, we would need to load its days. For now, we skip this
    // since plan-days are loaded on detail page.
    // In a real app, we might fetch a summary or cached days.
  } catch (e) {
    console.error('Failed to load plans:', e)
  } finally {
    loading.value = false
  }
}

const historyPlans = computed(() =>
  allPlans.value.filter((p) => p.status !== 'ACTIVE')
)

onMounted(() => {
  loadPlans()
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

.active-card {
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  position: relative;
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24rpx;
}

.plan-name {
  font-size: 36rpx;
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

.progress-info {
  margin-bottom: 24rpx;
}

.progress-text {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 12rpx;
}

.progress-bar {
  height: 8rpx;
  background: #eee;
  border-radius: 4rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #333;
  border-radius: 4rpx;
  transition: width 0.3s;
}

.week-schedule {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.day-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12rpx 16rpx;
  border-radius: 12rpx;
  min-width: 72rpx;
}

.day-chip.rest {
  background: #f5f5f5;
}

.day-chip.training {
  background: #fff3e0;
}

.day-abbr {
  font-size: 22rpx;
  color: #999;
  margin-bottom: 4rpx;
}

.day-type-abbr {
  font-size: 26rpx;
  color: #333;
  font-weight: 500;
}

.card-arrow {
  position: absolute;
  right: 32rpx;
  top: 50%;
  transform: translateY(-50%);
  font-size: 48rpx;
  color: #ccc;
}

.no-plan-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 0;
  background: #fff;
  border-radius: 24rpx;
}

.tip-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
}

.tip-text {
  font-size: 32rpx;
  color: #333;
  font-weight: bold;
  display: block;
  margin-bottom: 12rpx;
}

.tip-sub {
  font-size: 26rpx;
  color: #999;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-radius: 16rpx;
  padding: 28rpx 32rpx;
  margin-bottom: 16rpx;
}

.history-info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.history-name {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.history-date {
  font-size: 24rpx;
  color: #999;
}

.history-right {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.status-badge {
  font-size: 24rpx;
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
}

.status-badge.completed { background: #e8f5e9; color: #07c160; }
.status-badge.archived { background: #f5f5f5; color: #999; }

.history-arrow {
  font-size: 36rpx;
  color: #ccc;
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
</style>