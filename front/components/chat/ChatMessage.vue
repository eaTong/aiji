<template>
  <view class="chat-message" :class="message.role">
    <!-- AI 头像 -->
    <view v-if="message.role === 'ai'" class="avatar">
      <text class="avatar-icon">🤖</text>
    </view>

    <!-- 消息内容 -->
    <view class="message-content">
      <!-- 文本消息 -->
      <view v-if="message.type === 'text'" class="bubble text-bubble">
        <text class="message-text">{{ message.content }}</text>
      </view>

      <!-- 卡片消息 -->
      <view v-else-if="message.type === 'card'" class="bubble card-bubble">
        <card-component
          :card-type="message.cardType"
          :card-data="message.cardData || {}"
          :actions="message.actions"
          @action="handleAction"
        />
      </view>
    </view>

    <!-- 用户头像 -->
    <view v-if="message.role === 'user'" class="avatar">
      <text class="avatar-icon">🧑</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import CardComponent from './cards/CardComponent.vue'
import type { AIMessage } from '@/api/chat'

const props = defineProps<{
  message: AIMessage
}>()

const emit = defineEmits<{
  action: [actionId: string]
}>()

function handleAction(actionId: string) {
  emit('action', actionId)
}
</script>

<style lang="scss" scoped>
.chat-message {
  display: flex;
  align-items: flex-start;
  max-width: 100%;

  &.user {
    flex-direction: row-reverse;
  }
}

.avatar {
  flex-shrink: 0;
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 12rpx;
}

.avatar-icon {
  font-size: 40rpx;
}

.message-content {
  max-width: 75%;
}

.bubble {
  padding: 16rpx 20rpx;
  border-radius: 24rpx;
  word-break: break-word;
}

.text-bubble {
  line-height: 1.5;
}

.chat-message.ai .text-bubble {
  background: #f0f0f0;
  color: #333;
  border-bottom-left-radius: 4rpx;
}

.chat-message.user .text-bubble {
  background: #07c160;
  color: #fff;
  border-bottom-right-radius: 4rpx;
}

.message-text {
  font-size: 28rpx;
  line-height: 1.5;
}

.card-bubble {
  padding: 0;
  overflow: hidden;
  background: #fff;
  border: 1rpx solid #eee;
  border-radius: 16rpx;
  min-width: 300rpx;
}
</style>
