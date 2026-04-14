<template>
  <view class="card-component" :class="cardType">
    <!-- weight-record 卡片 -->
    <WeightRecordCard
      v-if="cardType === 'weight-record'"
      :card-data="(cardData as any)"
      :actions="actions"
      :disabled="disabled"
      @action="handleAction"
    />

    <!-- training-recommend 卡片 -->
    <TrainingRecommendCard
      v-else-if="cardType === 'training-recommend'"
      :card-data="(cardData as any)"
      :actions="actions"
      :disabled="disabled"
      @action="handleAction"
    />

    <!-- training-editable 卡片 -->
    <TrainingEditableCard
      v-else-if="cardType === 'training-editable'"
      :card-data="(cardData as any)"
      :actions="actions"
      :disabled="disabled"
      @action="handleAction"
    />

    <!-- recovery-status 卡片 -->
    <RecoveryStatusCard
      v-else-if="cardType === 'recovery-status'"
      :card-data="(cardData as any)"
      :actions="actions"
      :disabled="disabled"
      @action="handleAction"
    />

    <!-- morning-report 卡片 -->
    <MorningReportCard
      v-else-if="cardType === 'morning-report'"
      :card-data="(cardData as any)"
      :actions="actions"
      :disabled="disabled"
      @action="handleAction"
    />

    <!-- weekly-report 卡片 -->
    <WeeklyReportCard
      v-else-if="cardType === 'weekly-report'"
      :card-data="(cardData as any)"
      :actions="actions"
      :disabled="disabled"
      @action="handleAction"
    />

    <!-- achievement 卡片 -->
    <AchievementCard
      v-else-if="cardType === 'achievement'"
      :card-data="(cardData as any)"
      :actions="actions"
      :disabled="disabled"
      @action="handleAction"
    />

    <!-- P2-P3 其他卡片统一渲染 -->
    <LegacyCardRenderer
      v-else-if="cardType"
      :card-type="cardType"
      :card-data="cardData"
      :actions="actions"
      :disabled="disabled"
      @action="handleAction"
    />

    <!-- 默认卡片 -->
    <view v-else class="default-card">
      <text>{{ JSON.stringify(cardData) }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import {
  LegacyCardRenderer,
  WeightRecordCard,
  TrainingRecommendCard,
  TrainingEditableCard,
  RecoveryStatusCard,
  MorningReportCard,
  WeeklyReportCard,
  AchievementCard
} from './index'

const props = defineProps<{
  cardType?: string
  cardData: Record<string, any>
  actions?: Array<{ id: string; label: string; action: string; target?: string }>
  disabled?: boolean
}>()

const emit = defineEmits<{
  action: [actionId: string]
}>()

function handleAction(actionId: string) {
  emit('action', actionId)
}
</script>

<style lang="scss" scoped>
.card-component {
  padding: 16rpx 0;
}

.default-card {
  padding: 16rpx;
  text-align: center;
  color: #999;
  font-size: 24rpx;
}
</style>
