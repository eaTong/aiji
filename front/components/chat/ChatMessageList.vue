<template>
  <scroll-view
    class="chat-message-list"
    scroll-y
    :scroll-top="scrollTop"
    :scroll-into-view="scrollIntoView"
    @scrolltoupper="handleScrollUpper"
  >
    <!-- 消息列表 -->
    <view
      v-for="(msg, index) in messages"
      :key="msg.id"
      :id="'msg-' + msg.id"
      class="message-wrapper"
      :class="msg.role"
    >
      <chat-message
        :message="msg"
        @action="handleAction(msg.id, $event)"
      />
    </view>

    <!-- 加载更多 -->
    <view v-if="hasMore" class="load-more" @click="loadMore">
      <text v-if="loading">加载中...</text>
      <text v-else>加载更多</text>
    </view>

    <!-- 空状态 -->
    <view v-if="messages.length === 0 && !loading" class="empty-state">
      <text class="empty-icon">💬</text>
      <text class="empty-text">开始和AI己对话吧</text>
    </view>
  </scroll-view>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import ChatMessage from './ChatMessage.vue'
import type { AIMessage } from '@/api/chat'

const props = defineProps<{
  messages: AIMessage[]
  hasMore?: boolean
  loading?: boolean
}>()

const emit = defineEmits<{
  loadMore: []
  action: [messageId: string, actionId: string]
}>()

const scrollTop = ref(0)
const scrollIntoView = ref('')

function handleAction(messageId: string, actionId: string) {
  emit('action', messageId, actionId)
}

function loadMore() {
  if (!props.loading) {
    emit('loadMore')
  }
}

// 滚动到底部
function scrollToBottom(smooth = true) {
  nextTick(() => {
    if (props.messages.length > 0) {
      const lastMsg = props.messages[props.messages.length - 1]
      scrollIntoView.value = 'msg-' + lastMsg.id
    }
  })
}

// 滚动到顶部
function scrollToTop() {
  scrollTop.value = 1
  setTimeout(() => {
    scrollTop.value = 0
  }, 100)
}

function handleScrollUpper() {
  // 下拉刷新
}

// 监听新消息，自动滚动
watch(
  () => props.messages.length,
  () => {
    scrollToBottom()
  }
)

defineExpose({
  scrollToBottom,
  scrollToTop
})
</script>

<style lang="scss" scoped>
.chat-message-list {
  flex: 1;
  height: 100%;
  padding: 20rpx;
  box-sizing: border-box;
}

.message-wrapper {
  display: flex;
  margin-bottom: 24rpx;

  &.user {
    justify-content: flex-end;
  }

  &.ai {
    justify-content: flex-start;
  }
}

.load-more {
  text-align: center;
  padding: 20rpx;
  color: #999;
  font-size: 24rpx;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 20rpx;
}

.empty-text {
  font-size: 28rpx;
  color: #999;
}
</style>
