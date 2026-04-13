<template>
  <view class="container">
    <BodySilhouette :data="latestRecord" @tap="onBodyPartTap" />

    <MeasurementTrendChart
      v-for="part in parts"
      :key="part"
      :canvas-id="`chart-${part}`"
      :title="partLabels[part]"
      :data="trendData(part)"
    />

    <MeasurementPopup
      :visible="popupVisible"
      :part="activePart"
      :current-value="popupCurrentValue"
      :previous-value="popupPreviousValue"
      @close="popupVisible = false"
      @confirm="onPopupConfirm"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import BodySilhouette from '../../components/BodySilhouette.vue'
import MeasurementPopup from '../../components/MeasurementPopup.vue'
import MeasurementTrendChart from '../../components/MeasurementTrendChart.vue'
import { createMeasurement, getMeasurements } from '../../api/bodyData'
import { today, dateRange } from '../../utils/date'
import { MeasurementRecord } from '../../types'

type PartKey = 'chest' | 'waist' | 'hip' | 'leftArm' | 'rightArm' | 'leftThigh' | 'rightThigh' | 'leftCalf' | 'rightCalf'

const parts: PartKey[] = ['chest', 'waist', 'hip', 'leftArm', 'rightArm', 'leftThigh', 'rightThigh', 'leftCalf', 'rightCalf']

const partLabels: Record<PartKey, string> = {
  chest: '胸围',
  waist: '腰围',
  hip: '臀围',
  leftArm: '左臂围',
  rightArm: '右臂围',
  leftThigh: '左大腿',
  rightThigh: '右大腿',
  leftCalf: '左小腿',
  rightCalf: '右小腿'
}

const allRecords = ref<MeasurementRecord[]>([])
const latestRecord = ref<Partial<MeasurementRecord>>({})

const activePart = ref<PartKey | null>(null)
const popupVisible = ref(false)
const popupCurrentValue = ref<number | undefined>()
const popupPreviousValue = ref<number | undefined>()

async function loadData() {
  const { startDate, endDate } = dateRange(90)
  allRecords.value = await getMeasurements(startDate, endDate)
  latestRecord.value = allRecords.value[allRecords.value.length - 1] ?? {}
}

function onBodyPartTap(part: PartKey) {
  activePart.value = part
  popupCurrentValue.value = latestRecord.value?.[part]
  popupPreviousValue.value = allRecords.value[allRecords.value.length - 2]?.[part]
  popupVisible.value = true
}

async function onPopupConfirm(value: number) {
  if (!activePart.value) return
  await createMeasurement({ recordedAt: today(), [activePart.value]: value })
  popupVisible.value = false
  await loadData()
  uni.showToast({ title: '记录成功', icon: 'success' })
}

function trendData(part: PartKey) {
  return allRecords.value
    .map((r) => ({ date: r.recordedAt, value: r[part] as number }))
    .filter((d) => d.value !== undefined)
}

onMounted(loadData)
</script>

<style>
.container { padding: 24rpx; background: #f5f5f5; }
</style>
