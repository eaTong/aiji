<template>
  <view class="container">
    <view class="form-card">
      <view class="form-row">
        <text class="form-label">昵称</text>
        <input v-model="form.nickname" placeholder="请输入昵称" class="form-input" />
      </view>
      <view class="form-row">
        <text class="form-label">身高 (cm)</text>
        <input type="digit" v-model="heightStr" placeholder="如 175" class="form-input" />
      </view>
      <view class="form-row">
        <text class="form-label">目标体重 (kg)</text>
        <input type="digit" v-model="targetWeightStr" placeholder="如 70" class="form-input" />
      </view>
      <view class="form-row">
        <text class="form-label">健身目标</text>
        <picker :range="goalOptions" :range-key="'label'" @change="onGoalChange">
          <text class="form-value">{{ currentGoalLabel }}</text>
        </picker>
      </view>
      <view class="form-row">
        <text class="form-label">每周训练天数</text>
        <picker :range="[1,2,3,4,5,6,7]" @change="e => form.weeklyTrainingDays = Number(e.detail.value) + 1">
          <text class="form-value">{{ form.weeklyTrainingDays }} 天</text>
        </picker>
      </view>
    </view>
    <button class="save-btn" @tap="save" :loading="saving">保存</button>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { updateProfile } from '../../api/user'
import { useUserStore } from '../../stores/user'

const userStore = useUserStore()
const saving = ref(false)
const form = reactive({
  nickname: '',
  weeklyTrainingDays: 3,
  goal: 'LOSE_FAT' as string,
})
const heightStr = ref('')
const targetWeightStr = ref('')

const goalOptions = [
  { label: '减脂', value: 'LOSE_FAT' },
  { label: '增肌', value: 'GAIN_MUSCLE' },
  { label: '塑形', value: 'BODY_SHAPE' },
  { label: '提升体能', value: 'IMPROVE_FITNESS' },
]
const currentGoalLabel = computed(
  () => goalOptions.find((g) => g.value === form.goal)?.label ?? ''
)
function onGoalChange(e: { detail: { value: number } }) {
  form.goal = goalOptions[e.detail.value].value
}

async function save() {
  saving.value = true
  try {
    const updated = await updateProfile({
      nickname: form.nickname,
      height: parseFloat(heightStr.value) || undefined,
      targetWeight: parseFloat(targetWeightStr.value) || undefined,
      goal: form.goal as 'LOSE_FAT' | 'GAIN_MUSCLE' | 'BODY_SHAPE' | 'IMPROVE_FITNESS',
      weeklyTrainingDays: form.weeklyTrainingDays,
    })
    userStore.setUser(updated)
    uni.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 1200)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  const user = userStore.user
  if (user) {
    form.nickname = user.nickname ?? ''
    heightStr.value = user.height ? String(user.height) : ''
    targetWeightStr.value = user.targetWeight ? String(user.targetWeight) : ''
    form.goal = user.goal ?? 'LOSE_FAT'
    form.weeklyTrainingDays = user.weeklyTrainingDays
  }
})
</script>

<style>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.form-card { background: #fff; border-radius: 24rpx; padding: 8rpx 32rpx; margin-bottom: 24rpx; }
.form-row { display: flex; align-items: center; justify-content: space-between; padding: 28rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.form-label { font-size: 28rpx; color: #666; }
.form-input { font-size: 28rpx; color: #333; text-align: right; }
.form-value { font-size: 28rpx; color: #333; }
.save-btn { background: #333; color: #fff; border-radius: 48rpx; }
</style>