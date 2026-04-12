<template>
  <view class="container">
    <view class="card">
      <text class="card-title">记录围度</text>
      <view v-for="field in fields" :key="field.key" class="input-row">
        <text class="field-label">{{ field.label }}</text>
        <input
          type="digit"
          v-model="form[field.key]"
          :placeholder="'cm'"
          class="field-input"
        />
      </view>
      <view class="input-row">
        <text class="field-label">体脂率</text>
        <input
          type="digit"
          v-model="form.bodyFat"
          placeholder="%"
          class="field-input"
        />
      </view>
      <button class="submit-btn" @tap="submit">保存今日围度</button>
    </view>

    <view class="card" v-if="latestRecord">
      <text class="card-title">上次记录（{{ latestRecord.recordedAt }}）</text>
      <view
        v-for="field in fields"
        :key="field.key"
        class="record-row"
      >
        <text>{{ field.label }}</text>
        <text>{{ latestRecord[field.key] ?? '--' }} cm</text>
      </view>
      <view class="record-row" v-if="latestRecord.bodyFat">
        <text>体脂率</text>
        <text>{{ latestRecord.bodyFat }}%</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { createMeasurement, getMeasurements } from '../../api/bodyData'
import { today, dateRange } from '../../utils/date'
import { MeasurementRecord } from '../../types'

const fields = [
  { key: 'waist', label: '腰围' },
  { key: 'hip', label: '臀围' },
  { key: 'chest', label: '胸围' },
  { key: 'leftArm', label: '左臂围' },
  { key: 'rightArm', label: '右臂围' },
  { key: 'leftThigh', label: '左大腿' },
  { key: 'rightThigh', label: '右大腿' },
  { key: 'leftCalf', label: '左小腿' },
  { key: 'rightCalf', label: '右小腿' },
] as const

const form = reactive<Record<string, string>>({ bodyFat: '' })
const latestRecord = ref<MeasurementRecord | null>(null)

async function submit() {
  const data: Record<string, unknown> = { recordedAt: today() }
  fields.forEach((f) => {
    if (form[f.key]) data[f.key] = parseFloat(form[f.key])
  })
  if (form.bodyFat) data.bodyFat = parseFloat(form.bodyFat)
  await createMeasurement(data)
  uni.showToast({ title: '记录成功', icon: 'success' })
  Object.keys(form).forEach((k) => { form[k] = '' })
  await loadLatest()
}

async function loadLatest() {
  const { startDate, endDate } = dateRange(90)
  const records = await getMeasurements(startDate, endDate)
  latestRecord.value = records[records.length - 1] ?? null
}

onMounted(loadLatest)
</script>

<style>
.container { padding: 24rpx; background: #f5f5f5; min-height: 100vh; }
.card { background: #fff; border-radius: 24rpx; padding: 32rpx; margin-bottom: 24rpx; }
.card-title { font-size: 32rpx; font-weight: bold; color: #333; display: block; margin-bottom: 24rpx; }
.input-row { display: flex; align-items: center; justify-content: space-between; padding: 16rpx 0; border-bottom: 1rpx solid #f0f0f0; }
.field-label { font-size: 28rpx; color: #666; }
.field-input { font-size: 28rpx; text-align: right; width: 150rpx; }
.record-row { display: flex; justify-content: space-between; padding: 16rpx 0; font-size: 28rpx; color: #666; border-bottom: 1rpx solid #f0f0f0; }
.submit-btn { margin-top: 32rpx; background: #333; color: #fff; border-radius: 48rpx; }
</style>