<template>
  <view class="container">
    <view v-if="loading" class="loading">加载中...</view>
    <template v-else>
      <RecoveryScore
        :score="status.score"
        :recommendation="status.recommendation"
        :sleep-hours="status.sleepHours"
        :editable="true"
        @sleep="onSleepInput"
      />
      <MuscleHeatmap :muscle-status="status.muscleStatus" />
      <view class="tips-card">
        <text class="tips-title">恢复建议</text>
        <text class="tips-content">{{ tipText }}</text>
      </view>
    </template>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import RecoveryScore from '../../components/recovery/RecoveryScore.vue'
import MuscleHeatmap from '../../components/recovery/MuscleHeatmap.vue'
import { getRecovery, postSleep, type RecoveryStatus } from '../../api/recovery'

const loading = ref(true)
const status = ref<RecoveryStatus>({
  date: '',
  score: 0,
  sleepHours: 0,
  muscleStatus: {},
  recommendation: 'REST',
})

const labelMap: Record<string, string> = {
  chest: '胸', back: '背', legs: '腿', shoulders: '肩', arms: '臂',
  core: '核心', upper_chest: '上胸', lats: '背阔', quads: '股四',
  hamstrings: '腘绳', glutes: '臀', triceps: '三头', biceps: '二头',
  abs: '腹', side_delts: '侧肩', rear_delts: '后肩',
}

const lowMuscles = computed(() => {
  return Object.entries(status.value.muscleStatus)
    .filter(([, v]) => v < 70)
    .map(([k]) => labelMap[k] ?? k)
})

const tipText = computed(() => {
  if (status.value.recommendation === 'REST') {
    return '身体恢复不足，建议今日休息。可进行轻度拉伸或散步。'
  }
  if (status.value.recommendation === 'LIGHT') {
    return '可以选择轻度活动，如瑜伽、散步或主动恢复训练。'
  }
  if (lowMuscles.value.length > 0) {
    return `大部分肌群恢复良好。可以训练，注意还未恢复的肌群（${lowMuscles.value.join('、')}）避免过度使用。`
  }
  return '身体状态良好，适合进行完整训练！'
})

function formatDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function fetchStatus() {
  loading.value = true
  try {
    status.value = await getRecovery(formatDate(new Date()))
  } finally {
    loading.value = false
  }
}

async function onSleepInput(hours: number) {
  const today = formatDate(new Date())
  const updated = await postSleep({ date: today, sleepHours: hours })
  status.value = updated
}

onMounted(fetchStatus)
</script>

<style scoped>
.container {
  padding: 12px;
}

.loading {
  text-align: center;
  padding: 40px;
  color: #999;
  font-size: 14px;
}

.tips-card {
  background: #fff;
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 12px;
}

.tips-title {
  font-size: 16px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
  display: block;
}

.tips-content {
  font-size: 14px;
  color: #666;
  line-height: 1.6;
}
</style>
