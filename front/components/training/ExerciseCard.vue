<template>
  <view class="exercise-card">
    <view class="exercise-header">
      <view class="exercise-info">
        <text class="exercise-name">{{ exercise.name }}</text>
        <view class="muscle-tags">
          <text class="muscle-tag" v-for="muscle in exercise.primaryMuscles" :key="muscle">
            {{ muscle }}
          </text>
        </view>
      </view>
      <view class="last-record" v-if="lastRecord">
        <text class="record-label">上次</text>
        <text class="record-value">{{ lastRecord.weight }}kg × {{ lastRecord.reps }}</text>
        <text class="record-e1rm" v-if="lastRecord.e1rm">e1rm: {{ lastRecord.e1rm }}kg</text>
      </view>
    </view>

    <view class="sets-list">
      <SetInput
        v-for="(set, index) in sets"
        :key="index"
        :setNumber="index + 1"
        :weight="set.weight"
        :reps="set.reps"
        :isWarmup="set.isWarmup"
        :suggestedWeight="index === 0 ? (lastRecord?.weight || 0) : sets[index - 1]?.weight || 0"
        @update:weight="updateSet(index, 'weight', $event)"
        @update:reps="updateSet(index, 'reps', $event)"
        @update:isWarmup="updateSet(index, 'isWarmup', $event)"
        @remove="removeSet(index)"
      />
    </view>

    <view class="add-set-btn" @tap="addSet">
      <text class="add-set-icon">+</text>
      <text class="add-set-text">添加一组</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import SetInput from './SetInput.vue'

interface Exercise {
  id: string
  name: string
  category: string
  primaryMuscles: string[]
}

interface LastRecord {
  weight: number
  reps: number
  e1rm?: number
}

interface SetData {
  weight: number
  reps: number
  isWarmup: boolean
}

const props = defineProps<{
  exercise: Exercise
  lastRecord?: LastRecord
}>()

const emit = defineEmits<{
  (e: 'change', sets: SetData[]): void
}>()

const sets = ref<SetData[]>([
  { weight: props.lastRecord?.weight || 0, reps: props.lastRecord?.reps || 0, isWarmup: false }
])

watch(sets, () => {
  emit('change', [...sets.value])
}, { deep: true })

watch(() => props.lastRecord, (record) => {
  if (record && sets.value.length === 1 && sets.value[0].weight === 0) {
    sets.value[0].weight = record.weight
    sets.value[0].reps = record.reps
  }
}, { immediate: true })

function updateSet(index: number, field: 'weight' | 'reps' | 'isWarmup', value: number | boolean) {
  sets.value[index][field] = value as never
}

function addSet() {
  const lastSet = sets.value[sets.value.length - 1]
  sets.value.push({
    weight: lastSet?.weight || 0,
    reps: lastSet?.reps || 0,
    isWarmup: false
  })
}

function removeSet(index: number) {
  if (sets.value.length > 1) {
    sets.value.splice(index, 1)
  }
}
</script>

<style>
.exercise-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.05);
}
.exercise-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24rpx;
}
.exercise-info {
  flex: 1;
}
.exercise-name {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  display: block;
  margin-bottom: 12rpx;
}
.muscle-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8rpx;
}
.muscle-tag {
  font-size: 22rpx;
  color: #666;
  background: #f5f5f5;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}
.last-record {
  text-align: right;
}
.record-label {
  font-size: 22rpx;
  color: #999;
  display: block;
}
.record-value {
  font-size: 26rpx;
  color: #333;
  display: block;
  margin-top: 4rpx;
}
.record-e1rm {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-top: 4rpx;
}
.sets-list {
  margin-bottom: 16rpx;
}
.add-set-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16rpx;
  border: 2rpx dashed #ddd;
  border-radius: 12rpx;
}
.add-set-icon {
  font-size: 32rpx;
  color: #999;
  margin-right: 8rpx;
}
.add-set-text {
  font-size: 28rpx;
  color: #999;
}
</style>