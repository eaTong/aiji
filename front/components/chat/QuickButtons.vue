<template>
  <view class="quick-buttons">
    <view
      v-for="btn in buttons"
      :key="btn.id"
      class="quick-btn"
      :class="btn.type"
      @click="handleClick(btn)"
    >
      <text class="btn-icon">{{ btn.icon }}</text>
      <text class="btn-text">{{ btn.text }}</text>
    </view>
  </view>
</template>

<script setup lang="ts">
const emit = defineEmits<{
  click: [button: { id: string; action: string; text: string }]
}>()

// 根据规格只有2个按钮
const buttons = [
  {
    id: 'train',
    icon: '🎯',
    text: '练什么',
    action: 'send',
    payload: '今天练什么好'
  },
  {
    id: 'record',
    icon: '📝',
    text: '记录',
    action: 'send',
    payload: '记录训练'
  }
]

function handleClick(btn: typeof buttons[0]) {
  emit('click', btn)
}
</script>

<style lang="scss" scoped>
.quick-buttons {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 24rpx;
  background: #fff;
  border-top: 1rpx solid #f0f0f0;
}

.quick-btn {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #07c160, #06ad56);
  border-radius: 16rpx;
  color: #fff;
  border: none;

  &.secondary {
    background: #f5f5f5;
    color: #333;
  }
}

.btn-icon {
  font-size: 32rpx;
}

.btn-text {
  font-size: 28rpx;
  font-weight: 500;
}
</style>
