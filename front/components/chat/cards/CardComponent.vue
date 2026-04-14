<template>
  <view class="card-component" :class="cardType">
    <!-- P0 和 P1 专用卡片组件 -->
    <template v-if="cardType && resolvedComponent">
      <component
        :is="resolvedComponent"
        :card-data="cardData"
        :actions="actions"
        :disabled="disabled"
        @action="handleAction"
      />
    </template>

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
import { computed } from 'vue'
import {
  cardTypeMap,
  LegacyCardRenderer
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

// 解析组件，TypeScript 需要显式类型转换
const resolvedComponent = computed(() => {
  if (!props.cardType) return null
  return (cardTypeMap as Record<string, any>)[props.cardType] || null
})

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
